import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function ListSection({ field, items, keys, addItem, updateItem, duplicateItem, onDragEnd, t }) {
  return (
    <div>
      <button
        type="button"
        onClick={() => addItem(field)}
        className="mb-2 px-2 py-1 bg-blue-500 text-white rounded"
      >
        {t('add')}
      </button>
      <DragDropContext onDragEnd={onDragEnd(field)}>
        <Droppable droppableId={field}>
          {provided => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {items.map((item, index) => (
                <Draggable key={index} draggableId={`${field}-${index}`} index={index}>
                  {provided => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="p-2 border rounded"
                    >
                      {keys.map(k => (
                        <input
                          key={k}
                          name={k}
                          placeholder={t(k)}
                          value={item[k] || ''}
                          onChange={e => updateItem(field, index, k, e.target.value)}
                          className="block w-full mb-1 p-1 border rounded"
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => duplicateItem(field, index)}
                        className="mt-1 px-2 py-1 bg-gray-200 rounded"
                      >
                        {t('duplicate')}
                      </button>
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
