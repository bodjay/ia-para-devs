import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnalysisStatus, AnalysisResult } from '../../domain/entities/Analysis';
import { bffClient } from '../../infrastructure/api/bffClient';

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

export const loadAnalysis = createAsyncThunk(
  'analysis/load',
  async (analysisId: string, { rejectWithValue }) => {
    try {
      return await bffClient.getAnalysis(analysisId);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const uploadAndAnalyzeDiagram = createAsyncThunk(
  'analysis/uploadAndAnalyze',
  async (payload: UploadDiagramPayload, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setStatus('uploading'));

      const { diagramId, analysisId } = await bffClient.uploadDiagram(
        payload.file,
        payload.sessionId
      );

      dispatch(setDiagramId(diagramId));
      dispatch(setStatus('processing'));

      const analysis = await bffClient.pollAnalysis(analysisId);

      dispatch(setStatus('responding'));

      return { diagramId, analysisId, analysis } as UploadDiagramResult;
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
      .addCase(loadAnalysis.fulfilled, (state, action) => {
        const { diagramId, result, status } = action.payload;
        if (status === 'completed' && result) {
          state.status = 'completed';
          state.result = result;
          state.diagramId = diagramId;
          state.analysisId = action.meta.arg;
          state.errorMessage = null;
        }
      })
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
