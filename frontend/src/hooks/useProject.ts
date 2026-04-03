'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { projectsApi } from '@/lib/api';
import { Project, ProjectCreate } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

export function useProject() {
  const { setActiveProject, activeProject } = useAppStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err: any) {
      // 401 = guest/unauthenticated — silently return empty list
      if (err?.response?.status !== 401) {
        toast.error('Gagal memuat proyek');
      }
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (data: ProjectCreate): Promise<Project | null> => {
    try {
      const project = await projectsApi.create(data);
      setProjects((prev) => [project, ...prev]);
      setActiveProject(project);
      toast.success('Proyek berhasil dibuat');
      return project;
    } catch {
      toast.error('Gagal membuat proyek');
      return null;
    }
  }, [setActiveProject]);

  const updateProject = useCallback(async (id: string, data: Partial<ProjectCreate>): Promise<void> => {
    try {
      const updated = await projectsApi.update(id, data);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (activeProject?.id === id) setActiveProject(updated);
      toast.success('Proyek diperbarui');
    } catch {
      toast.error('Gagal memperbarui proyek');
    }
  }, [activeProject, setActiveProject]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    try {
      await projectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) setActiveProject(null);
      toast.success('Proyek dihapus');
    } catch {
      toast.error('Gagal menghapus proyek');
    }
  }, [activeProject, setActiveProject]);

  return { projects, isLoading, loadProjects, createProject, updateProject, deleteProject, activeProject, setActiveProject };
}
