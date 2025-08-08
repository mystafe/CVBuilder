import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useTranslation } from 'react-i18next';
import CVPreview from './CVPreview';
import CVDocument from './CVDocument';

const stepKeys = ['personalInfo', 'experience', 'education', 'skills'];

const initialData = {
  personal: { name: '', email: '', phone: '', location: '' },
  experience: [],
  education: [],
  skills: []
};

function MultiStepForm() {
  const { t } = useTranslation();
  const steps = stepKeys.map(k => t(k));
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('cvFormData');
    return saved ? JSON.parse(saved) : initialData;
  });

  const personalSchema = z.object({
    name: z.string().min(1, t('errorRequired')),
    email: z.string().email(t('errorEmail')),
    phone: z.string().optional(),
    location: z.string().optional()
  });

  const personalForm = useForm({
    resolver: zodResolver(personalSchema),
    defaultValues: data.personal
  });

  useEffect(() => {
    localStorage.setItem('cvFormData', JSON.stringify(data));
  }, [data, step]);

  const next = () => {
    if (step === 0) {
      personalForm.handleSubmit(values => {
        setData(prev => ({ ...prev, personal: values }));
        setStep(s => Math.min(s + 1, steps.length - 1));
      })();
    } else {
      setStep(s => Math.min(s + 1, steps.length - 1));
    }
  };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const resetAll = () => {
    localStorage.removeItem('cvFormData');
    setData(initialData);
    setStep(0);
    personalForm.reset(initialData.personal);
  };

  const addItem = field => {
    setData(prev => ({ ...prev, [field]: [...prev[field], {}] }));
  };

  const duplicateItem = (field, index) => {
    setData(prev => {
      const items = [...prev[field]];
      items.splice(index + 1, 0, { ...items[index] });
      return { ...prev, [field]: items };
    });
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
              {data[field].map((item, index) => (
                <Draggable key={index} draggableId={`${field}-${index}`} index={index}>
                  {provided => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="p-2 border rounded">
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

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-2">
            <input
              {...personalForm.register('name')}
              placeholder={t('name')}
              className="w-full p-2 border rounded"
            />
            {personalForm.formState.errors.name && (
              <p className="text-red-500 text-sm">
                {personalForm.formState.errors.name.message}
              </p>
            )}
            <input
              {...personalForm.register('email')}
              placeholder={t('email')}
              className="w-full p-2 border rounded"
            />
            {personalForm.formState.errors.email && (
              <p className="text-red-500 text-sm">
                {personalForm.formState.errors.email.message}
              </p>
            )}
            <input
              {...personalForm.register('phone')}
              placeholder={t('phone')}
              className="w-full p-2 border rounded"
            />
            <input
              {...personalForm.register('location')}
              placeholder={t('location')}
              className="w-full p-2 border rounded"
            />
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
        <div className="flex justify-between items-center">
          <div className="w-full bg-gray-200 h-2 rounded mr-4">
            <div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }} />
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="px-2 py-1 bg-red-500 text-white rounded text-sm"
          >
            {t('resetAll')}
          </button>
        </div>
        <h2 className="text-xl font-semibold">
          {t('step', { number: step + 1, name: steps[step] })}
        </h2>
        {renderStep()}
        <div className="flex justify-between">
          {step > 0 && (
            <button type="button" onClick={prev} className="px-4 py-2 bg-gray-200 rounded">
              {t('back')}
            </button>
          )}
          {step < steps.length - 1 && (
            <button type="button" onClick={next} className="ml-auto px-4 py-2 bg-blue-500 text-white rounded">
              {t('next')}
            </button>
          )}
        </div>
      </div>
      <div className="w-1/2 p-4 border-l overflow-y-auto">
        <CVPreview data={data} />
        <div className="mt-4">
          <PDFDownloadLink
            document={<CVDocument data={data} labels={{ experience: t('experience'), education: t('education'), skills: t('skills') }} />}
            fileName="cv.pdf"
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            {({ loading }) => (loading ? t('generatingPdfButton') : t('exportPdf'))}
          </PDFDownloadLink>
        </div>
      </div>
    </div>
  );
}

export default MultiStepForm;

