import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import CVDocument from './CVDocument';

export default function PDFExportButton({ data, t }) {
  return (
    <PDFDownloadLink
      document={<CVDocument data={data} labels={{ experience: t('experience'), education: t('education'), skills: t('skills') }} />}
      fileName="cv.pdf"
      className="px-4 py-2 bg-green-500 text-white rounded"
    >
      {({ loading }) => (loading ? t('generatingPdfButton') : t('exportPdf'))}
    </PDFDownloadLink>
  );
}
