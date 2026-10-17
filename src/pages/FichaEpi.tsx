import React from 'react';
import { FichaEpiLayoutConfig } from '../components/features/reports/FichaEpiLayoutConfig';

export function FichaEpi() {
  return (
    <div className="w-full">
      <FichaEpiLayoutConfig defaultTab="generate" />
    </div>
  );
}

export default FichaEpi;
