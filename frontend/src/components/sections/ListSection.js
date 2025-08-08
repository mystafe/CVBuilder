import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export default function ListSection({ field, items, keys, addItem, updateItem, duplicateItem, onDragEnd, t }) {
  return (
    <div>
      <Button type="button" onClick={() => addItem(field)} className="mb-4">
        {t('add')}
      </Button>
      <DragDropContext onDragEnd={onDragEnd(field)}>
        <Droppable droppableId={field}>
          {provided => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-4">
              {items.map((item, index) => (
                <Draggable key={index} draggableId={`${field}-${index}`} index={index}>
                  {provided => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="space-y-2 rounded-lg bg-white dark:bg-zinc-900 p-4 shadow-sm"
                    >
                      {keys.map(k => (
                        <Input
                          key={k}
                          name={k}
                          placeholder={t(k)}
                          value={item[k] || ''}
                          onChange={e => updateItem(field, index, k, e.target.value)}
                          className="mb-2"
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => duplicateItem(field, index)}
                      >
                        {t('duplicate')}
                      </Button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
