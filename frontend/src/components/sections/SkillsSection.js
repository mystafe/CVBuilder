import React from 'react';
import { useTranslation } from 'react-i18next';
import ListSection from './ListSection';

export default function SkillsSection(props) {
  const { t } = useTranslation();
  return (
    <ListSection field="skills" keys={['name']} t={t} {...props} />
  );
}
