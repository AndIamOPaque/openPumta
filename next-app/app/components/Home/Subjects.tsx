'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Subject, columns } from './Subjects/columns';
import { DataTable } from './Subjects/data-table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTimerStore } from '@/store/useTimerStore';
import {
  useSubjects,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
} from '@/hooks/useSubjects';
import { useAuthStore } from '@/store/useAuthStore';
import { ConvertSecsToTimer } from '@/lib/utils';

function Subjects() {
  const { user } = useAuthStore();
  const { data: Subjects = [] } = useSubjects();
  const createSubject = useCreateSubject();
  const updateSubjectMutation = useUpdateSubject();
  const deleteSubjectMutation = useDeleteSubject();

  const { activeSubjectId, startWork, phase, running } = useTimerStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubjectColor, setNewSubjectColor] = useState('#f97316');
  const [editSubjectColor, setEditSubjectColor] = useState('#f97316');

  const router = useRouter();

  const handlePlayClick = async (subjectId: number) => {
    try {
      await startWork(subjectId);
      console.log(phase);
      if (phase != 'work') router.push('/pomodoro');
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setEditSubjectColor(subject.color || '#f97316');
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this subject?')) {
      deleteSubjectMutation.mutate(id);
    }
  };

  return (
    <section className="flex flex-col h-full p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h1 className="text-2xl font-bold">Subjects</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size={'sm'} className="font-bold">
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!user) return;
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const hours = Number(formData.get('hours')) || 0;
                const minutes = Number(formData.get('minutes')) || 0;
                const seconds = Number(formData.get('seconds')) || 0;
                const goalWorkSecs = hours * 3600 + minutes * 60 + seconds;

                createSubject.mutate({ name, goalWorkSecs, color: newSubjectColor });
                e.currentTarget.reset();
                setNewSubjectColor('#f97316');
                setIsAddDialogOpen(false);
              }}
              className="flex flex-col gap-4"
            >
              <Input name="name" placeholder="Subject Name" required />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Goal Time</span>
                <div className="flex items-center gap-2">
                  <Input name="hours" placeholder="hh" type="number" min={0} />
                  <span>:</span>
                  <Input name="minutes" placeholder="mm" type="number" min={0} max={59} />
                  <span>:</span>
                  <Input name="seconds" placeholder="ss" type="number" min={0} max={59} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Subject Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newSubjectColor}
                    onChange={(e) => setNewSubjectColor(e.target.value)}
                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                  />
                </div>
              </div>
              <Button type="submit" disabled={createSubject.isPending}>
                {createSubject.isPending ? 'Adding...' : 'Add'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-hidden">
        <DataTable
          columns={columns({
            toggleTimer: handlePlayClick,
            runningSubjectId: phase === 'work' && running ? activeSubjectId : null,
            deleteSubject: handleDelete,
            handleEdit: handleEdit,
          })}
          data={Subjects}
        />
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          {editingSubject && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingSubject) return;
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const hours = Number(formData.get('hours')) || 0;
                const minutes = Number(formData.get('minutes')) || 0;
                const seconds = Number(formData.get('seconds')) || 0;
                const goalWorkSecs = hours * 3600 + minutes * 60 + seconds;

                updateSubjectMutation.mutate({
                  id: editingSubject.id,
                  name,
                  goalWorkSecs,
                  color: editSubjectColor,
                });
                setIsEditDialogOpen(false);
                setEditingSubject(null);
              }}
              className="flex flex-col gap-4"
            >
              <Input
                name="name"
                placeholder="Subject Name"
                required
                defaultValue={editingSubject?.name}
              />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Goal Time</span>
                <div className="flex items-center gap-2">
                  <Input
                    name="hours"
                    placeholder="hh"
                    type="number"
                    min={0}
                    defaultValue={
                      ConvertSecsToTimer({ workSecs: editingSubject.goalWorkSecs || 0 }).hours
                    }
                  />
                  <span>:</span>
                  <Input
                    name="minutes"
                    placeholder="mm"
                    type="number"
                    min={0}
                    max={59}
                    defaultValue={
                      ConvertSecsToTimer({ workSecs: editingSubject.goalWorkSecs || 0 }).minutes
                    }
                  />
                  <span>:</span>
                  <Input
                    name="seconds"
                    placeholder="ss"
                    type="number"
                    min={0}
                    max={59}
                    defaultValue={
                      ConvertSecsToTimer({ workSecs: editingSubject.goalWorkSecs || 0 }).seconds
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Subject Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editSubjectColor}
                    onChange={(e) => setEditSubjectColor(e.target.value)}
                    className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                  />
                </div>
              </div>
              <Button type="submit" disabled={updateSubjectMutation.isPending}>
                Save
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default Subjects;
