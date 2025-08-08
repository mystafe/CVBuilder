import React from 'react';
import { useTranslation } from 'react-i18next';

export default function PersonalSection({ form }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <input
        {...form.register('name')}
        placeholder={t('name')}
        className="w-full p-2 border rounded"
      />
      {form.formState.errors.name && (
        <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
      )}
      <input
        {...form.register('email')}
        placeholder={t('email')}
        className="w-full p-2 border rounded"
      />
      {form.formState.errors.email && (
        <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
      )}
      <input
        {...form.register('phone')}
        placeholder={t('phone')}
        className="w-full p-2 border rounded"
      />
      <input
        {...form.register('location')}
        placeholder={t('location')}
        className="w-full p-2 border rounded"
      />
    </div>
  );
}
