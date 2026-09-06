import type { ServiceIdentifier } from '@/shared/di'
import type { ApiClient } from './client'
import type { UnauthorizedBus } from './unauthorized'

export const API_CLIENT: ServiceIdentifier<ApiClient> = Symbol('ApiClient')
export const UNAUTHORIZED_BUS: ServiceIdentifier<UnauthorizedBus> = Symbol('UnauthorizedBus')
