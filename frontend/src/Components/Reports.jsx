import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { user } = useAuth();
  return (
    <div style={{ padding: 20 }}>
      <h2>Reports</h2>
      <p>Generate and view reports (HR #{user?.id ?? '—'})</p>
      {/* TODO: add report filters, export options, charts */}
    </div>
  );
}