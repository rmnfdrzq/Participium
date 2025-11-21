import { useState, useEffect } from 'react';
import API from '../../../API/API.mjs';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';



function InspectReportPage() {

  const selectedReport = useSelector((state) => state.report.selected);


  return (
    <div>
      <h1>Inspect Report</h1>

      {!selectedReport ? (
        <p>No report selected.</p>
      ) : (
        <div>
          <p><strong>ID:</strong> {selectedReport.id}</p>
          <p><strong>Title:</strong> {selectedReport.title}</p>
          <p><strong>Created At:</strong> {selectedReport.created_at}</p>
          <p><strong>Description</strong>{selectedReport.description}</p>
          
        </div>
      )}
    </div>
  );
}