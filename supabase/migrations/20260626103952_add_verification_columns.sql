/*
# Add verification columns to profiles

## Overview
Adds email and phone verification tracking columns to the profiles table
to support the new verification system.

## Changes to existing table: profiles
- email_verified boolean default false — tracks whether email is confirmed
- phone_verified boolean default false — tracks whether phone is verified
- phone_verification_method text default 'demo' — 'demo' or 'sms'
- phone_verified_at timestamptz nullable — when phone was verified

## Security
- No RLS policy changes needed — existing owner-scoped policies cover new columns
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verification_method text DEFAULT 'demo',
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

-- Backfill: mark existing profiles as email_verified if they have auth.users.email_confirmed_at
UPDATE profiles
SET email_verified = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL
);
