import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function FinalDocuments() {
  const { user } = useAuth();
  return (
    <div style={{ padding: 20 }}>
      <h2>Final Documents</h2>
      <p>Download or manage final documents for completed participants (HR #{user?.id ?? '—'})</p>
      {/* TODO: list documents, provide download/upload actions */}
    </div>
  );
}