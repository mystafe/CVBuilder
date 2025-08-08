import React from 'react';
import { useTranslation } from 'react-i18next';
import PersonalBlock from './cv/PersonalBlock';
import ExperienceBlock from './cv/ExperienceBlock';
import EducationBlock from './cv/EducationBlock';
import SkillsBlock from './cv/SkillsBlock';

function CVPreview({ data }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <PersonalBlock personal={data.personal} />
      <ExperienceBlock experience={data.experience} label={t('experience')} />
      <EducationBlock education={data.education} label={t('education')} />
      <SkillsBlock skills={data.skills} label={t('skills')} />
    </div>
  );
}

export default CVPreview;
