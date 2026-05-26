'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Column, useCreateColumn, useUpdateColumn, useDeleteColumn } from '@/hooks/useColumns';
import {
  Block,
  BlockType,
  useCreateBlock,
  useUpdateBlock,
  useDeleteBlock,
  useMoveBlock,
} from '@/hooks/useBlocks';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { ColumnCard } from './ColumnCard';
import { BlockItem } from './BlockItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';

interface BoardViewProps {
  spaceId: number;
  columns: Column[];
  /** Map of columnId → blocks */
  blocksByColumn: Record<number, Block[]>;
}

export function BoardView({ spaceId, columns, blocksByColumn }: BoardViewProps) {
  const { activeFilter, dateRange, focusedColumnId, setFocusedColumn } = useWorkspaceStore();
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  const queryClient = useQueryClient();
  const createColumn = useCreateColumn();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const createBlock = useCreateBlock();
  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();
  const moveBlock = useMoveBlock();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ─── DnD handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find block by id
    for (const col of columns) {
      const found = (blocksByColumn[col.id] || []).find((b) => b.id === active.id);
      if (found) {
        setActiveBlock(found);
        break;
      }
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Optimistic reorder handled in dragEnd
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBlock(null);

    if (!over || active.id === over.id) return;

    // Detect if dragging over a column drop target
    const overIdStr = String(over.id);
    const isOverColumn = overIdStr.startsWith('col-');
    const targetColumnId = isOverColumn ? Number(overIdStr.replace('col-', '')) : null;

    // Find source block and column
    let sourceBlock: Block | null = null;
    let sourceColumnId: number | null = null;

    for (const col of columns) {
      const found = (blocksByColumn[col.id] || []).find((b) => b.id === active.id);
      if (found) {
        sourceBlock = found;
        sourceColumnId = col.id;
        break;
      }
    }

    if (!sourceBlock || sourceColumnId === null) return;

    // Case 1: dropped onto another column header → move cross-column
    if (targetColumnId && targetColumnId !== sourceColumnId) {
      const targetBlocks = blocksByColumn[targetColumnId] || [];
      const newOrder = targetBlocks.length;
      moveBlock.mutate(
        { id: sourceBlock.id, sourceColumnId, targetColumnId, order: newOrder },
        { onError: () => toast.error('Failed to move block') },
      );
      return;
    }

    // Case 2: dropped onto another block (same or different column)
    let destColumnId = sourceColumnId;
    let destBlock: Block | null = null;
    for (const col of columns) {
      const found = (blocksByColumn[col.id] || []).find((b) => b.id === over.id);
      if (found) {
        destBlock = found;
        destColumnId = col.id;
        break;
      }
    }

    if (!destBlock) return;

    // Cross-column move
    if (destColumnId !== sourceColumnId) {
      moveBlock.mutate(
        {
          id: sourceBlock.id,
          sourceColumnId,
          targetColumnId: destColumnId,
          order: destBlock.order,
        },
        { onError: () => toast.error('Failed to move block') },
      );
      return;
    }

    // Same-column reorder — optimistic update then persist
    const colBlocks = [...(blocksByColumn[sourceColumnId] || [])];
    const oldIndex = colBlocks.findIndex((b) => b.id === active.id);
    const newIndex = colBlocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(colBlocks, oldIndex, newIndex).map((b, i) => ({
      ...b,
      order: i,
    }));

    // Optimistic cache update
    queryClient.setQueryData(['blocks', sourceColumnId, activeFilter, dateRange], reordered);

    // Persist to backend via api (carries JWT cookie)
    api
      .patch(`/columns/${sourceColumnId}/blocks/reorder`, {
        blocks: reordered.map((b) => ({ id: b.id, order: b.order })),
      })
      .catch(() => {
        queryClient.invalidateQueries({ queryKey: ['blocks', sourceColumnId] });
        toast.error('Failed to reorder blocks');
      });
  };

  // ─── Column actions ────────────────────────────────────────────────────────
  const handleCreateColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    createColumn.mutate(
      { spaceId, title: newColumnTitle.trim() },
      {
        onSuccess: () => {
          setNewColumnTitle('');
          setIsAddingColumn(false);
          toast.success('Column added');
        },
        onError: () => toast.error('Failed to create column'),
      },
    );
  };

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);
  const columnIds = sortedColumns.map((c) => c.id);

  // Filter to focused column if in focus mode
  const visibleColumns = focusedColumnId
    ? sortedColumns.filter((c) => c.id === focusedColumnId)
    : sortedColumns;

  // ─── Mobile: Tabs view ─────────────────────────────────────────────────────
  const mobileView = (
    <div className="flex flex-col gap-4 px-4 md:hidden">
      {sortedColumns.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">
          No columns yet. Add your first column above.
        </div>
      ) : (
        <Tabs defaultValue={String(sortedColumns[0]?.id)}>
          <TabsList className="flex flex-wrap gap-1 h-auto bg-muted/30 p-1 rounded-xl mb-4">
            {sortedColumns.map((col) => (
              <TabsTrigger
                key={col.id}
                value={String(col.id)}
                className="text-xs rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {col.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {sortedColumns.map((col) => {
            const colBlocks = (blocksByColumn[col.id] || []).sort((a, b) => a.order - b.order);
            return (
              <TabsContent key={col.id} value={String(col.id)}>
                <div className="flex flex-col gap-1 bg-card/60 rounded-xl border border-border/30 p-3">
                  {colBlocks.map((block) => (
                    <BlockItem
                      key={block.id}
                      block={block}
                      onUpdate={(updates) => updateBlock.mutate(updates)}
                      onDelete={(id) =>
                        deleteBlock.mutate(
                          { columnId: col.id, id },
                          { onSuccess: () => toast.success('Block deleted') },
                        )
                      }
                    />
                  ))}
                  {colBlocks.length === 0 && (
                    <p className="text-xs text-muted-foreground/50 text-center py-4 italic">
                      No blocks yet
                    </p>
                  )}
                  <div className="pt-2 border-t border-border/20">
                    {(['HEADING', 'PARAGRAPH', 'TODO', 'DIVIDER'] as BlockType[]).map((type) => (
                      <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          createBlock.mutate(
                            { columnId: col.id, type },
                            { onSuccess: () => toast.success('Block added') },
                          )
                        }
                      >
                        + {type}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );

  // ─── Desktop: Kanban board ─────────────────────────────────────────────────
  const desktopView = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="hidden md:flex items-start gap-3 px-4 pb-6 overflow-x-auto min-h-[calc(100vh-200px)]">
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {visibleColumns.map((col) => {
            const colBlocks = (blocksByColumn[col.id] || []).sort((a, b) => a.order - b.order);
            return (
              <ColumnCard
                key={col.id}
                column={col}
                blocks={colBlocks}
                onUpdateColumn={(updates) => updateColumn.mutate(updates)}
                onDeleteColumn={(id) =>
                  deleteColumn.mutate(
                    { spaceId, id },
                    { onSuccess: () => toast.success('Column deleted') },
                  )
                }
                onCreateBlock={(type) =>
                  createBlock.mutate(
                    { columnId: col.id, type },
                    { onSuccess: () => toast.success('Block added') },
                  )
                }
                onUpdateBlock={(updates) => updateBlock.mutate(updates)}
                onDeleteBlock={(id) =>
                  deleteBlock.mutate(
                    { columnId: col.id, id },
                    { onSuccess: () => toast.success('Block deleted') },
                  )
                }
                isFocused={focusedColumnId === col.id}
                onFocus={() => setFocusedColumn(col.id)}
                onUnfocus={() => setFocusedColumn(null)}
              />
            );
          })}
        </SortableContext>

        {/* Resize handle visual separators are handled by column gaps */}

        {/* Add Column Button */}
        <div className="flex-shrink-0">
          {isAddingColumn ? (
            <form
              onSubmit={handleCreateColumn}
              className="flex items-center gap-2 bg-card/60 border border-border/30 rounded-xl px-3 py-2 w-[220px]"
            >
              <Input
                autoFocus
                placeholder="Column title..."
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                className="h-7 text-sm bg-transparent border-0 p-0 focus-visible:ring-0 flex-1"
              />
              <Button type="submit" size="icon" className="h-6 w-6 shrink-0">
                <Check className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => {
                  setIsAddingColumn(false);
                  setNewColumnTitle('');
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </form>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/30"
              onClick={() => setIsAddingColumn(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              add-column
            </Button>
          )}
        </div>
      </div>

      {/* Drag overlay — shows floating copy of dragged block */}
      <DragOverlay>
        {activeBlock && (
          <div className="bg-card border border-primary/40 rounded-lg shadow-xl shadow-black/30 px-3 py-2 opacity-95 rotate-1 cursor-grabbing w-64">
            <p className="text-sm text-foreground truncate">{activeBlock.content || '—'}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );

  return (
    <>
      {mobileView}
      {desktopView}
    </>
  );
}
