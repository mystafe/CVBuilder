import React from 'react';
import { useTranslation } from 'react-i18next';
import ListSection from './ListSection';

export default function ExperienceSection(props) {
  const { t } = useTranslation();
  return (
    <ListSection
      field="experience"
      keys={['title', 'company', 'date', 'description']}
      t={t}
      {...props}
    />
  );
}
