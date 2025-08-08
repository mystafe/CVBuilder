import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useCVForm } from '../hooks/useCVForm';
import MainLayout from './layout/MainLayout';
import CVPreview from './CVPreview';
import CVForm from './CVForm';

const PDFExportButton = lazy(() => import('./PDFExportButton'));

export default function CVBuilder() {
  const { t } = useTranslation();
  const form = useCVForm();
  const { data } = form;

  return (
    <MainLayout
      sidebar={
        <>
          <CVPreview data={data} />
          <div className="mt-4">
            <Suspense fallback={<div>{t('generatingPdfButton')}</div>}>
              <PDFExportButton data={data} t={t} />
            </Suspense>
          </div>
        </>
      }
    >
      <CVForm {...form} />
    </MainLayout>
  );
}
