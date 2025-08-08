import React from 'react';
import { useTranslation } from 'react-i18next';
import PersonalSection from './sections/PersonalSection';
import ExperienceSection from './sections/ExperienceSection';
import EducationSection from './sections/EducationSection';
import SkillsSection from './sections/SkillsSection';

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
  );
}

export default CVForm;
