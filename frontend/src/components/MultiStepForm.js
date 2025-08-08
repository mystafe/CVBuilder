import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import CVPreview from './CVPreview';

const steps = ['Personal', 'Experience', 'Education', 'Skills'];

const initialData = {
  personal: { name: '', email: '', phone: '', location: '' },
  experience: [],
  education: [],
  skills: []
};

function MultiStepForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('cvFormData');
    return saved ? JSON.parse(saved) : initialData;
  });

  useEffect(() => {
    localStorage.setItem('cvFormData', JSON.stringify(data));
  }, [data, step]);

  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const updatePersonal = e => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, personal: { ...prev.personal, [name]: value } }));
  };

  const addItem = field => {
    setData(prev => ({ ...prev, [field]: [...prev[field], {}] }));
  };

  const updateItem = (field, index, key, value) => {
    setData(prev => {
      const items = [...prev[field]];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, [field]: items };
    });
  };

  const onDragEnd = (field) => result => {
    if (!result.destination) return;
    const items = Array.from(data[field]);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setData(prev => ({ ...prev, [field]: items }));
  };

  const renderList = (field, keys) => (
    <div>
      <button type="button" onClick={() => addItem(field)} className="mb-2 px-2 py-1 bg-blue-500 text-white rounded">Add</button>
      <DragDropContext onDragEnd={onDragEnd(field)}>
        <Droppable droppableId={field}>
          {provided => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {data[field].map((item, index) => (
                <Draggable key={index} draggableId={`${field}-${index}`} index={index}>
                  {provided => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="p-2 border rounded">
                      {keys.map(k => (
                        <input
                          key={k}
                          name={k}
                          placeholder={k}
                          value={item[k] || ''}
                          onChange={e => updateItem(field, index, k, e.target.value)}
                          className="block w-full mb-1 p-1 border rounded"
                        />
                      ))}
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

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-2">
            <input name="name" placeholder="Name" value={data.personal.name} onChange={updatePersonal} className="w-full p-2 border rounded" />
            <input name="email" placeholder="Email" value={data.personal.email} onChange={updatePersonal} className="w-full p-2 border rounded" />
            <input name="phone" placeholder="Phone" value={data.personal.phone} onChange={updatePersonal} className="w-full p-2 border rounded" />
            <input name="location" placeholder="Location" value={data.personal.location} onChange={updatePersonal} className="w-full p-2 border rounded" />
          </div>
        );
      case 1:
        return renderList('experience', ['title', 'company', 'date', 'description']);
      case 2:
        return renderList('education', ['degree', 'institution', 'date']);
      case 3:
        return renderList('skills', ['name']);
      default:
        return null;
    }
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="flex">
      <div className="w-1/2 p-4 space-y-4">
        <div className="w-full bg-gray-200 h-2 rounded">
          <div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }} />
        </div>
        <h2 className="text-xl font-semibold">Step {step + 1}: {steps[step]}</h2>
        {renderStep()}
        <div className="flex justify-between">
          {step > 0 && <button type="button" onClick={prev} className="px-4 py-2 bg-gray-200 rounded">Back</button>}
          {step < steps.length - 1 && <button type="button" onClick={next} className="ml-auto px-4 py-2 bg-blue-500 text-white rounded">Next</button>}
        </div>
      </div>
      <div className="w-1/2 p-4 border-l overflow-y-auto">
        <CVPreview data={data} />
      </div>
    </div>
  );
}

export default MultiStepForm;

