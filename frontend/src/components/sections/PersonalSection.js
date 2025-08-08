import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/input';

export default function PersonalSection({ form }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <Input {...form.register('name')} placeholder={t('name')} />
      {form.formState.errors.name && (
        <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
      )}
      <Input {...form.register('email')} placeholder={t('email')} />
      {form.formState.errors.email && (
        <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
      )}
      <Input {...form.register('phone')} placeholder={t('phone')} />
      <Input {...form.register('location')} placeholder={t('location')} />
    </div>
  );
}
