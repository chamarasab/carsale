import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScrapeRunDocument = HydratedDocument<ScrapeRun>;
export type ScrapeRunTrigger = 'manual' | 'scheduled';
export type ScrapeRunStatus = 'running' | 'success' | 'partial' | 'failed' | 'interrupted';

@Schema({ _id: false })
export class ScrapeJobResult {
  @Prop({ required: true, type: String })
  maker: string;

  @Prop({ required: true, type: String })
  model: string;

  @Prop({ default: 0, type: Number })
  fetched: number;

  @Prop({ default: 0, type: Number })
  imported: number;

  @Prop({ default: 0, type: Number })
  inserted: number;

  @Prop({ default: 0, type: Number })
  updated: number;

  @Prop({ type: String })
  error?: string;
}

const ScrapeJobResultSchema = SchemaFactory.createForClass(ScrapeJobResult);

@Schema({ suppressReservedKeysWarning: true, timestamps: true })
export class ScrapeRun {
  @Prop({ default: 'JP Center', required: true, type: String })
  source: string;

  @Prop({ enum: ['manual', 'scheduled'], required: true, type: String })
  trigger: ScrapeRunTrigger;

  @Prop({
    enum: ['running', 'success', 'partial', 'failed', 'interrupted'],
    default: 'running',
    required: true,
    type: String,
  })
  status: ScrapeRunStatus;

  @Prop({ required: true, type: Date })
  startedAt: Date;

  @Prop({ type: Date })
  finishedAt?: Date;

  @Prop({ default: 0, type: Number })
  durationMs: number;

  @Prop({ default: 0, type: Number })
  fetched: number;

  @Prop({ default: 0, type: Number })
  imported: number;

  @Prop({ default: 0, type: Number })
  inserted: number;

  @Prop({ default: 0, type: Number })
  updated: number;

  @Prop({ default: 0, type: Number })
  failedJobs: number;

  @Prop({ default: [], type: [ScrapeJobResultSchema] })
  jobs: ScrapeJobResult[];

  @Prop({ default: [], type: [String] })
  errors: string[];
}

export const ScrapeRunSchema = SchemaFactory.createForClass(ScrapeRun);
