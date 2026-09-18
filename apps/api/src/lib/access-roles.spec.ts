import { describe, expect, it } from 'vitest'
import {
  getPersistedRoleForProfile,
  inferUserProfile,
  normalizeUserRole,
  resolvePermissions,
} from '@viviani/types'

describe('vocabulário de perfis e roles', () => {
  it('persiste COLLABORATOR como MANAGER enquanto o enum legado existir', () => {
    expect(getPersistedRoleForProfile('COLLABORATOR')).toBe('MANAGER')
  })

  it('normaliza COLLABORATOR e MANAGER para o mesmo role persistido', () => {
    expect(normalizeUserRole('COLLABORATOR')).toBe('MANAGER')
    expect(normalizeUserRole('MANAGER')).toBe('MANAGER')
  })

  it('mantém o perfil de produto e as permissões do colaborador', () => {
    expect(inferUserProfile('MANAGER', ['leads'])).toBe('COLLABORATOR')
    expect(resolvePermissions('MANAGER', ['leads'])).toContain('leads.update')
  })
})
