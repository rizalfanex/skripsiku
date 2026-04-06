'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Trash2, ExternalLink, Search, FolderOpen } from 'lucide-react';
import { useProject } from '@/hooks/useProject';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { DOCUMENT_TYPE_LABELS, formatRelativeDate } from '@/lib/utils';
import { DocumentType, ProjectCreate } from '@/lib/types';

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, isLoading, loadProjects, createProject, deleteProject, setActiveProject } = useProject();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsCreating(true);
    const project = await createProject({ title: title.trim() } as ProjectCreate);
    setIsCreating(false);
    if (project) {
      setShowModal(false);
      setTitle('');
      router.push(`/projects/${project.id}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteProject(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Proyek Saya</h1>
            <p className="text-sm text-slate-400 mt-1">Kelola semua proyek akademik Anda</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Proyek Baru
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari proyek..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card h-44 animate-pulse bg-navy-800/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <FolderOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">
            {search ? 'Tidak ada proyek yang cocok' : 'Belum ada proyek'}
          </p>
          <p className="text-sm text-slate-400 mb-6">
            {search ? 'Coba kata kunci lain' : 'Buat proyek pertama Anda dan mulai menulis!'}
          </p>
          {!search && (
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> Buat Proyek
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group h-full relative">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={project.document_type === 'thesis' ? 'primary' : 'gold'} className="text-xs">
                    {DOCUMENT_TYPE_LABELS[project.document_type as DocumentType]?.id}
                  </Badge>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setActiveProject(project);
                        router.push(`/projects/${project.id}`);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 transition"
                      title="Buka proyek"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(project.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Hapus proyek"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3
                  className="font-semibold text-white text-sm mb-2 line-clamp-2 cursor-pointer hover:text-primary-300 transition-colors"
                  onClick={() => {
                    setActiveProject(project);
                    router.push(`/projects/${project.id}`);
                  }}
                >
                  {project.title}
                </h3>

                {project.description && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs text-slate-500 font-mono bg-navy-700 px-2 py-0.5 rounded">
                    {project.citation_style.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500 font-mono bg-navy-700 px-2 py-0.5 rounded">
                    {project.language.toUpperCase()}
                  </span>
                  {project.academic_field && (
                    <span className="text-xs text-slate-500 bg-navy-700 px-2 py-0.5 rounded truncate max-w-[120px]">
                      {project.academic_field}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600">{formatRelativeDate(project.updated_at)}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setTitle(''); }} title="Proyek Baru" size="sm">
        <form onSubmit={handleCreate}>
          <Input
            id="proj-title"
            label="Nama Proyek"
            placeholder="Contoh: Skripsi Psikologi, Jurnal Informatika..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => { setShowModal(false); setTitle(''); }} type="button">Batal</Button>
            <Button type="submit" isLoading={isCreating} disabled={!title.trim()}>
              Buat <Plus className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Hapus Proyek?" size="sm">
        <p className="text-sm text-slate-400 mb-6">
          Proyek dan semua percakapannya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Batal</Button>
          <Button variant="danger" onClick={handleDelete}>Ya, Hapus</Button>
        </div>
      </Modal>
    </div>
  );
}
