/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth } from './firebase';
import { 
  getUserProfile, 
  createUserProfile, 
  getAllProjects, 
  createProject, 
  createTask, 
  updateTask, 
  deleteTask, 
  getDailyTasks, 
  getMyTasks,
  getAllUsers,
  updateUserRole,
  testConnection
} from './firebaseService';
import { UserProfile, Project, Task, UserRole } from './types';
import { 
  LayoutDashboard, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  Users, 
  LogOut, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  Trash2,
  Edit,
  Shield,
  Briefcase,
  User as UserIcon,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Error Boundary Placeholder
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const AppContent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'users' | 'my-tasks'>('dashboard');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [superuserMode, setSuperuserMode] = useState(true);

  // New Task State
  const [newTask, setNewTask] = useState({
    projectId: '',
    title: '',
    description: '',
    completionPercentage: 0,
    deadline: '',
    assignedTo: '',
    assignedBy: '',
    date: new Date().toISOString().split('T')[0]
  });

  // New Project State
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });

  const isUserAdmin = useMemo(() => {
    if (!superuserMode && user?.email === 'rohaniskhati@gmail.com') return false;
    return profile?.role === 'admin' || profile?.role === 'superuser' || user?.email === 'rohaniskhati@gmail.com';
  }, [profile, user, superuserMode]);

  const isUserSuperuser = useMemo(() => {
    return profile?.role === 'superuser' || user?.email === 'rohaniskhati@gmail.com';
  }, [profile, user]);

  const admins = useMemo(() => {
    return users.filter(u => u.role === 'admin' || u.role === 'superuser');
  }, [users]);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        let userProfile = await getUserProfile(currentUser.uid);
        if (!userProfile) {
          const isSuperUserEmail = currentUser.email === 'rohaniskhati@gmail.com';
          userProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'User',
            role: isSuperUserEmail ? 'superuser' : 'employee',
            createdAt: new Date()
          };
          await createUserProfile(userProfile);
        }
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubProjects = getAllProjects(setProjects);
    return () => unsubProjects();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let unsubTasks: () => void;
    if (activeTab === 'dashboard') {
      unsubTasks = getDailyTasks(selectedDate, setTasks);
    } else if (activeTab === 'my-tasks') {
      unsubTasks = getMyTasks(user.uid, setTasks);
    }
    return () => unsubTasks && unsubTasks();
  }, [user, activeTab, selectedDate]);

  useEffect(() => {
    if (user) {
      getAllUsers().then(setUsers);
    }
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    const taskData: any = {
      ...newTask,
      assignedBy: isUserAdmin ? user.uid : newTask.assignedBy,
      assignedTo: isUserAdmin ? newTask.assignedTo : user.uid,
    };
    
    if (!taskData.projectId) delete taskData.projectId;
    
    await createTask(taskData);
    setShowTaskModal(false);
    setNewTask({
      projectId: '',
      title: '',
      description: '',
      completionPercentage: 0,
      deadline: '',
      assignedTo: '',
      assignedBy: '',
      date: selectedDate
    });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await createProject({
      ...newProject,
      createdBy: user.uid
    });
    setShowProjectModal(false);
    setNewProject({ name: '', description: '' });
  };

  const handleUpdateTaskProgress = async (taskId: string, percentage: number) => {
    await updateTask(taskId, { completionPercentage: percentage });
  };

  const handleUpdateUserRole = async (uid: string, role: UserRole) => {
    await updateUserRole(uid, role);
    const updatedUsers = await getAllUsers();
    setUsers(updatedUsers);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LayoutDashboard size={40} className="text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Task Tracker Pro</h1>
          <p className="text-slate-500 mb-8">Manage your projects and daily tasks with ease.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <LayoutDashboard size={24} className="text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900">TaskPro</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Daily Overview" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<Clock size={20} />} 
            label="My Tasks" 
            active={activeTab === 'my-tasks'} 
            onClick={() => setActiveTab('my-tasks')} 
          />
          {isUserAdmin && (
            <>
              <SidebarItem 
                icon={<Briefcase size={20} />} 
                label="Projects" 
                active={activeTab === 'projects'} 
                onClick={() => setActiveTab('projects')} 
              />
              <SidebarItem 
                icon={<Users size={20} />} 
                label="User Management" 
                active={activeTab === 'users'} 
                onClick={() => setActiveTab('users')} 
              />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          {isUserSuperuser && (
            <div className="mb-4 p-3 bg-indigo-50 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 uppercase">SU Mode</span>
              <button 
                onClick={() => setSuperuserMode(!superuserMode)}
                className={`w-10 h-5 rounded-full transition-all relative ${superuserMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${superuserMode ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
              {profile?.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{profile?.displayName}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.email === 'rohaniskhati@gmail.com' ? 'Superuser' : profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Daily Progress'}
              {activeTab === 'my-tasks' && 'My Assignments'}
              {activeTab === 'projects' && 'Project Management'}
              {activeTab === 'users' && 'User Privileges'}
            </h2>
            <p className="text-slate-500">
              {activeTab === 'dashboard' && `Tracking tasks for ${new Date(selectedDate).toLocaleDateString()}`}
              {activeTab === 'my-tasks' && 'Manage your assigned responsibilities'}
              {activeTab === 'projects' && 'Create and monitor organizational projects'}
              {activeTab === 'users' && 'Manage access levels and roles'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'dashboard' && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button 
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-2 hover:bg-slate-50 rounded-lg"
                >
                  <ChevronLeft size={20} />
                </button>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1 font-medium text-slate-700 outline-none"
                />
                <button 
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-2 hover:bg-slate-50 rounded-lg"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            <button 
              onClick={() => activeTab === 'projects' ? setShowProjectModal(true) : setShowTaskModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <PlusCircle size={20} />
              {activeTab === 'projects' ? 'New Project' : 'Assign Task'}
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + selectedDate}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="grid grid-cols-1 gap-6"
          >
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {tasks.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
                      <Calendar size={48} className="text-slate-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-slate-900 mb-2">No tasks scheduled</h3>
                      <p className="text-slate-500">There are no tasks assigned for this date.</p>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        projects={projects} 
                        users={users}
                        onUpdateProgress={handleUpdateTaskProgress}
                        onDelete={isUserAdmin ? () => deleteTask(task.id) : undefined}
                      />
                    ))
                  )}
                </div>
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-green-500" />
                      Daily Stats
                    </h3>
                    <div className="space-y-4">
                      <StatItem label="Total Tasks" value={tasks.length} />
                      <StatItem label="Completed" value={tasks.filter(t => t.completionPercentage === 100).length} />
                      <StatItem label="In Progress" value={tasks.filter(t => t.completionPercentage > 0 && t.completionPercentage < 100).length} />
                      <div className="pt-4 border-t border-slate-50">
                        <p className="text-sm text-slate-500 mb-2">Average Completion</p>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full transition-all duration-500" 
                            style={{ width: `${tasks.length ? tasks.reduce((acc, t) => acc + t.completionPercentage, 0) / tasks.length : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'my-tasks' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tasks.filter(t => t.assignedTo === user.uid).length === 0 ? (
                  <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
                    <CheckCircle2 size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">All caught up!</h3>
                    <p className="text-slate-500">You don't have any tasks assigned to you.</p>
                  </div>
                ) : (
                  tasks.filter(t => t.assignedTo === user.uid).map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      projects={projects} 
                      users={users}
                      onUpdateProgress={handleUpdateTaskProgress}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map(project => (
                  <div key={project.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                        <Briefcase size={24} />
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {new Date(project.createdAt?.toDate?.() || project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{project.name}</h3>
                    <p className="text-slate-500 text-sm mb-6 line-clamp-2">{project.description}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold">
                          {users.find(u => u.uid === project.createdBy)?.displayName?.[0] || 'A'}
                        </div>
                        <span className="text-xs text-slate-500">Created by Admin</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Current Role</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map(u => (
                      <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
                              {u.displayName?.[0] || 'U'}
                            </div>
                            <span className="font-bold text-slate-900">{u.displayName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            u.role === 'superuser' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.uid, e.target.value as UserRole)}
                            disabled={u.uid === user.uid || (profile?.role === 'admin' && u.role === 'superuser')}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                            {isUserSuperuser && <option value="superuser">Superuser</option>}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modals */}
      <Modal show={showTaskModal} onClose={() => setShowTaskModal(false)} title="Assign New Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Project (Optional)</label>
            <select 
              value={newTask.projectId}
              onChange={e => setNewTask({...newTask, projectId: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">General Task (No Project)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Task Title</label>
            <input 
              required
              type="text"
              value={newTask.title}
              onChange={e => setNewTask({...newTask, title: e.target.value})}
              placeholder="What needs to be done?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
            <textarea 
              value={newTask.description}
              onChange={e => setNewTask({...newTask, description: e.target.value})}
              placeholder="Add some details..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {isUserAdmin ? (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Assign To</label>
                <select 
                  required
                  value={newTask.assignedTo}
                  onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select User</option>
                  {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Assigned By (Manager)</label>
                <select 
                  required
                  value={newTask.assignedBy}
                  onChange={e => setNewTask({...newTask, assignedBy: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Manager</option>
                  {admins.map(u => <option key={u.uid} value={u.uid}>{u.displayName} ({u.role})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Deadline</label>
              <input 
                required
                type="datetime-local"
                value={newTask.deadline}
                onChange={e => setNewTask({...newTask, deadline: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            Create Task
          </button>
        </form>
      </Modal>

      <Modal show={showProjectModal} onClose={() => setShowProjectModal(false)} title="Create New Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Project Name</label>
            <input 
              required
              type="text"
              value={newProject.name}
              onChange={e => setNewProject({...newProject, name: e.target.value})}
              placeholder="Project Alpha..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
            <textarea 
              value={newProject.description}
              onChange={e => setNewProject({...newProject, description: e.target.value})}
              placeholder="What is this project about?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
            />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            Create Project
          </button>
        </form>
      </Modal>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active 
        ? 'bg-indigo-50 text-indigo-700 font-bold' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

interface TaskCardProps {
  task: Task;
  projects: Project[];
  users: UserProfile[];
  onUpdateProgress: (id: string, p: number) => void;
  onDelete?: () => void;
}

const TaskCard = ({ task, projects, users, onUpdateProgress, onDelete }: any) => {
  const project = projects.find(p => p.id === task.projectId);
  const assignedTo = users.find(u => u.uid === task.assignedTo);
  const assignedBy = users.find(u => u.uid === task.assignedBy);

  const [deadlineProgress, setDeadlineProgress] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const calculateProgress = () => {
      const start = new Date(task.createdAt?.toDate?.() || task.createdAt).getTime();
      const end = new Date(task.deadline).getTime();
      const now = new Date().getTime();

      if (now >= end) {
        setDeadlineProgress(100);
        setIsOverdue(true);
      } else {
        const total = end - start;
        const elapsed = now - start;
        const progress = Math.max(0, Math.min(100, (elapsed / total) * 100));
        setDeadlineProgress(progress);
        setIsOverdue(false);
      }
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [task]);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md mb-2 inline-block ${
            project ? 'text-indigo-500 bg-indigo-50' : 'text-slate-500 bg-slate-50'
          }`}>
            {project?.name || 'General Task'}
          </span>
          <h4 className="text-xl font-bold text-slate-900">{task.title}</h4>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 size={18} />
          </button>
        )}
      </div>
      
      <p className="text-slate-500 text-sm mb-6">{task.description}</p>
      
      <div className="space-y-4">
        {/* Task Completion Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Task Progress</span>
            <span className="text-xs font-bold text-indigo-600">{task.completionPercentage}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={task.completionPercentage}
            onChange={(e) => onUpdateProgress(task.id, parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* Deadline Progress Visual */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Clock size={12} />
              Time Remaining
            </span>
            <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : 'text-slate-500'}`}>
              {isOverdue ? 'OVERDUE' : `${Math.round(100 - deadlineProgress)}% left`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${deadlineProgress}%` }}
              className={`h-full transition-all duration-1000 ${isOverdue ? 'bg-red-500' : 'bg-amber-400'}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Due: {new Date(task.deadline).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserIcon size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500">To: {assignedTo?.displayName || '...'}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Shield size={14} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">By: {assignedBy?.displayName || 'Admin'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ label, value }: { label: string, value: number }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="font-bold text-slate-900">{value}</span>
  </div>
);

const Modal = ({ show, onClose, title, children }: { show: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {show && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900">
              <PlusCircle size={24} className="rotate-45" />
            </button>
          </div>
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
