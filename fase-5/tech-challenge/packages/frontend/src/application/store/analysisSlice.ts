import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnalysisStatus, AnalysisResult } from '../../domain/entities/Analysis';

export interface AnalysisState {
  analysisId: string | null;
  status: AnalysisStatus;
  diagramId: string | null;
  result: AnalysisResult | null;
  errorMessage: string | null;
}

const initialState: AnalysisState = {
  analysisId: null,
  status: 'idle',
  diagramId: null,
  result: null,
  errorMessage: null,
};

export interface UploadDiagramPayload {
  sessionId: string;
  file: File;
}

export interface UploadDiagramResult {
  diagramId: string;
  analysisId: string;
  analysis: AnalysisResult;
}

export const uploadAndAnalyzeDiagram = createAsyncThunk(
  'analysis/uploadAndAnalyze',
  async (payload: UploadDiagramPayload, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setStatus('uploading'));

      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('sessionId', payload.sessionId);

      const uploadResponse = await fetch('/api/diagrams/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ message: uploadResponse.statusText }));
        throw new Error(errorData.message ?? `Upload failed with status ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();
      dispatch(setDiagramId(uploadData.diagramId));
      dispatch(setStatus('processing'));

      const analysisResponse = await fetch(`/api/analysis/${uploadData.analysisId}`);
      if (!analysisResponse.ok) {
        throw new Error(`Analysis fetch failed: ${analysisResponse.statusText}`);
      }

      dispatch(setStatus('responding'));
      const analysisData = await analysisResponse.json();

      return {
        diagramId: uploadData.diagramId,
        analysisId: uploadData.analysisId,
        analysis: analysisData.result as AnalysisResult,
      } as UploadDiagramResult;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<AnalysisStatus>) => {
      state.status = action.payload;
    },
    setDiagramId: (state, action: PayloadAction<string>) => {
      state.diagramId = action.payload;
    },
    setAnalysisResult: (state, action: PayloadAction<{ analysisId: string; result: AnalysisResult }>) => {
      state.analysisId = action.payload.analysisId;
      state.result = action.payload.result;
      state.status = 'completed';
      state.errorMessage = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.errorMessage = action.payload;
    },
    resetAnalysis: (state) => {
      state.analysisId = null;
      state.status = 'idle';
      state.diagramId = null;
      state.result = null;
      state.errorMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadAndAnalyzeDiagram.fulfilled, (state, action) => {
        state.status = 'completed';
        state.analysisId = action.payload.analysisId;
        state.diagramId = action.payload.diagramId;
        state.result = action.payload.analysis;
        state.errorMessage = null;
      })
      .addCase(uploadAndAnalyzeDiagram.rejected, (state, action) => {
        state.status = 'error';
        state.errorMessage = action.payload as string;
      });
  },
});

export const { setStatus, setDiagramId, setAnalysisResult, setError, resetAnalysis } = analysisSlice.actions;

export default analysisSlice.reducer;
