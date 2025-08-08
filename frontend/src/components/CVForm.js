import React from 'react';
import { useTranslation } from 'react-i18next';
import PersonalSection from './sections/PersonalSection';
import ExperienceSection from './sections/ExperienceSection';
import EducationSection from './sections/EducationSection';
import SkillsSection from './sections/SkillsSection';
import { Button } from './ui/button';

function CVForm({ step, data, addItem, updateItem, duplicateItem, onDragEnd, next, prev, resetAll, personalForm, stepKeys }) {
  const { t } = useTranslation();
  const steps = stepKeys.map(k => t(k));

  const renderStep = () => {
    switch (step) {
      case 0:
        return <PersonalSection form={personalForm} />;
      case 1:
        return (
          <ExperienceSection
            items={data.experience}
            addItem={addItem}
            updateItem={updateItem}
            duplicateItem={duplicateItem}
            onDragEnd={onDragEnd}
          />
        );
      case 2:
        return (
          <EducationSection
            items={data.education}
            addItem={addItem}
            updateItem={updateItem}
            duplicateItem={duplicateItem}
            onDragEnd={onDragEnd}
          />
        );
      case 3:
        return (
          <SkillsSection
            items={data.skills}
            addItem={addItem}
            updateItem={updateItem}
            duplicateItem={duplicateItem}
            onDragEnd={onDragEnd}
          />
        );
      default:
        return null;
    }
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-full bg-gray-200 h-2 rounded">
          <div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }} />
        </div>
        <Button size="sm" variant="outline" onClick={resetAll}>
          {t('resetAll')}
        </Button>
      </div>
      <h2 className="text-xl font-semibold">
        {t('step', { number: step + 1, name: steps[step] })}
      </h2>
      {renderStep()}
      <div className="flex justify-between">
        {step > 0 && (
          <Button type="button" onClick={prev} variant="outline">
            {t('back')}
          </Button>
        )}
        {step < steps.length - 1 && (
          <Button type="button" onClick={next} className="ml-auto">
            {t('next')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default CVForm;
