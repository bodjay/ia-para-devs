import mongoose, { Schema, Document } from 'mongoose';
import { Session, SessionProps } from '../../domain/entities/Session';
import { ISessionRepository } from '../../domain/repositories/ISessionRepository';

interface SessionDocument extends Document {
  sessionId: string;
  name: string;
  createdAt: Date;
  lastActiveAt: Date;
  diagramId?: string;
  analysisId?: string;
}

const SessionSchema = new Schema<SessionDocument>({
  sessionId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  createdAt: { type: Date, required: true },
  lastActiveAt: { type: Date, required: true },
  diagramId: { type: String },
  analysisId: { type: String },
});

const SessionModel = mongoose.model<SessionDocument>('Session', SessionSchema);

export class SessionRepository implements ISessionRepository {
  async save(session: Session): Promise<void> {
    const doc = new SessionModel(session.toJSON());
    await doc.save();
  }

  async findAll(): Promise<Session[]> {
    const docs = await SessionModel.find().sort({ lastActiveAt: -1 });
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string): Promise<Session | null> {
    const doc = await SessionModel.findOne({ sessionId: id });
    if (!doc) return null;
    return this.toEntity(doc);
  }

  async update(session: Session): Promise<void> {
    const data = session.toJSON();
    await SessionModel.updateOne({ sessionId: session.sessionId }, { $set: data });
  }

  private toEntity(doc: SessionDocument): Session {
    const props: SessionProps = {
      sessionId: doc.sessionId,
      name: doc.name,
      createdAt: doc.createdAt,
      lastActiveAt: doc.lastActiveAt,
      diagramId: doc.diagramId,
      analysisId: doc.analysisId,
    };
    return new Session(props);
  }
}
