/**
 * Compile-time check that each mock offers everything its real module does,
 * with compatible types. If a real module gains or changes an export,
 * `npm run type-check` fails here until the mock is updated.
 * This file is type-only and is never imported by the app.
 */
import type * as RealAuth from '@/auth/msal'
import type * as RealStorage from '@/services/storage'
import type * as RealGraph from '@/services/graph'
import type * as MockAuth from './auth'
import type * as MockStorage from './storage'
import type * as MockGraph from './graph'

type Implements<Mock extends Real, Real> = [Mock, Real]

// The MSAL instance itself isn't part of the app-facing API.
export type AuthCheck = Implements<typeof MockAuth, Omit<typeof RealAuth, 'msal'>>
export type StorageCheck = Implements<typeof MockStorage, typeof RealStorage>
export type GraphCheck = Implements<typeof MockGraph, typeof RealGraph>
