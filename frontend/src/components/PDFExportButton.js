import React, { useEffect, useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import CVDocument from './CVDocument';
import Toast from './ui/toast';

export default function PDFExportButton({ data, t }) {
  const [loadingState, setLoadingState] = useState(true);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!loadingState) {
      setShowToast(true);
    }
  }, [loadingState]);

  return (
    <>
      <PDFDownloadLink
        document={<CVDocument data={data} labels={{ experience: t('experience'), education: t('education'), skills: t('skills') }} />}
        fileName="cv.pdf"
        className="px-4 py-2 bg-green-500 text-white rounded"
      >
        {({ loading }) => {
          if (loading !== loadingState) {
            setLoadingState(loading);
          }
          return loading ? t('generatingPdfButton') : t('exportPdf');
        }}
      </PDFDownloadLink>
      <Toast message="CV ready!" visible={showToast} onClose={() => setShowToast(false)} />
    </>
  );
}
