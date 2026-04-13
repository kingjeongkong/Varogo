export interface CreateProductInput {
  name: string;
  url: string;
  oneLiner: string;
  stage: 'pre-launch' | 'just-launched' | 'growing' | 'established';
  currentTraction: {
    users: 'none' | 'under-100' | '100-1000' | '1000-plus';
    revenue: 'none' | 'under-1k' | '1k-10k' | '10k-plus';
    socialProof?: string;
  };
  additionalInfo?: string;
}
