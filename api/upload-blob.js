// api/upload-blob.js
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function POST(request) {
  const { filename } = await request.json();

  // Generate a secure upload URL
  const blob = await put(filename, request.body, {
    access: 'public',
  });

  return NextResponse.json(blob);
}