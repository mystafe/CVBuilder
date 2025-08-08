import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from './useLocalStorage';

export const stepKeys = ['personalInfo', 'experience', 'education', 'skills'];

const initialData = {
  personal: { name: '', email: '', phone: '', location: '' },
  experience: [],
  education: [],
  skills: []
};

export function useCVForm() {
  const { t } = useTranslation();
  const [data, setData, resetStorage] = useLocalStorage('cvFormData', initialData);
  const [step, setStep] = useState(0);

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

  const next = () => {
    if (step === 0) {
      personalForm.handleSubmit(values => {
        setData(prev => ({ ...prev, personal: values }));
        setStep(s => Math.min(s + 1, stepKeys.length - 1));
      })();
    } else {
      setStep(s => Math.min(s + 1, stepKeys.length - 1));
    }
  };

  const prev = () => setStep(s => Math.max(s - 1, 0));

  const resetAll = () => {
    resetStorage();
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

  const onDragEnd = field => result => {
    if (!result.destination) return;
    const items = Array.from(data[field]);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setData(prev => ({ ...prev, [field]: items }));
  };

  return {
    step,
    data,
    personalForm,
    addItem,
    duplicateItem,
    updateItem,
    onDragEnd,
    next,
    prev,
    resetAll,
    stepKeys
  };
}

