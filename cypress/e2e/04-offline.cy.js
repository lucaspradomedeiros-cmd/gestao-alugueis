describe('04 - Sincronização Offline (localStorage)', () => {
  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    cy.window().then((win) => {
      win.localStorage.clear()
    })
    cy.visit('/')
  })

  describe('localStorage Persistence', () => {
    it('deve salvar tenant em localStorage ao criar', () => {
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-name').type('João Silva')
      cy.get('#tenant-rent').type('1500')
      cy.contains('Salvar Inquilino').click()

      // Verificar que foi salvo em localStorage
      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        expect(data.tenants).to.have.lengthOf(1)
        expect(data.tenants[0].name).to.equal('João Silva')
      })
    })

    it('deve restaurar tenant após reload da página', () => {
      // Criar tenant
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Maria')
      cy.get('#tenant-rent').type('2000')
      cy.contains('Salvar Inquilino').click()

      // Reload
      cy.reload()

      // Deve estar lá
      cy.contains('Maria').should('exist')
      cy.contains('R$ 2.000,00').should('exist')
    })

    it('deve manter histórico de pagamentos após reload', () => {
      // Criar tenant + pagamento
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Pedro')
      cy.get('#tenant-rent').type('1500')
      cy.contains('Salvar Inquilino').click()

      // Ir para detalhes e adicionar pagamento
      cy.contains('Pedro').click()
      cy.contains('Adicionar Pagamento').click()
      cy.get('#pay-value').type('1500')
      cy.get('#pay-date').type('2026-04-05')
      cy.contains('Salvar Pagamento').click()

      // Reload
      cy.reload()

      // Deve restaurar pagamento
      cy.contains('Pedro').click()
      cy.get('[data-test="payment-item"]').should('exist')
    })

    it('deve serializar corretamente condoHistories', () => {
      // Mudar de condomínio e adicionar dados
      cy.get('[data-test="condo-switcher"]').select('c2')
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-name').type('Ana')
      cy.get('#tenant-rent').type('1800')
      cy.contains('Salvar').click()

      // Verificar localStorage
      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        expect(data.condoHistories['c2']).to.exist
      })

      // Reload
      cy.reload()

      // Deve restaurar condo ativo
      cy.contains('Ana').should('exist')
    })
  })

  describe('Debounced Save', () => {
    it('deve fazer debounce de saves (não salvar a cada keystroke)', () => {
      let saveCount = 0

      cy.window().then((win) => {
        const originalSetItem = win.localStorage.setItem
        win.localStorage.setItem = function(key, value) {
          if (key === 'gestao_alugueis_v1') saveCount++
          return originalSetItem.call(this, key, value)
        }
      })

      // Adicionar inquilino
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('João')  // 4 keystrokes
      cy.get('#tenant-rent').type('1500')  // 4 keystrokes

      cy.window().then((win) => {
        // Deve ter salvado 0 vezes durante a digitação (debounce 3s)
        expect(saveCount).to.equal(0)
      })

      cy.contains('Salvar Inquilino').click()

      // Deve ter salvo após click
      cy.window().then((win) => {
        expect(saveCount).to.be.greaterThan(0)
      })
    })
  })

  describe('Offline Mode (sem Drive)', () => {
    it('deve funcionar sem conectar Google Drive', () => {
      // Criar dados sem Drive conectado
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Lucas')
      cy.get('#tenant-rent').type('2500')
      cy.contains('Salvar Inquilino').click()

      // Deve mostrar que está offline
      cy.get('[data-test="save-status"]').should('contain', 'Local')

      // Deve estar em localStorage
      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        expect(data.tenants).to.have.lengthOf(1)
      })
    })

    it('deve alertar quando tentar usar features que precisam Drive offline', () => {
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Test')
      cy.get('#tenant-rent').type('1000')
      cy.contains('Salvar').click()

      // Tentar fazer algo que precisa sync
      // Deve alertar "Drive desconectado"
      cy.get('[data-test="save-status"]').should('contain', 'desconectado')
    })
  })

  describe('Data Migration', () => {
    it('deve carregar dados de versão anterior (v3 → v4)', () => {
      cy.window().then((win) => {
        // Simular dados antigos
        const oldData = {
          tenants: [{ id: 't1', name: 'João', condoId: 'c1' }],
          version: 3,
          savedAt: '2026-04-20T10:00:00Z'
        }
        win.localStorage.setItem('gestao_alugueis_v1', JSON.stringify(oldData))
      })

      cy.reload()

      // Deve converter e manter dados
      cy.contains('João').should('exist')
      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        expect(data.version).to.equal(4)
      })
    })

    it('deve adicionar propriedades faltantes ao carregar', () => {
      cy.window().then((win) => {
        // Dados sem alguns campos
        const incompleteData = {
          tenants: [{ id: 't1', name: 'Maria' }],  // Faltam: condoId, rentValue
          version: 4
        }
        win.localStorage.setItem('gestao_alugueis_v1', JSON.stringify(incompleteData))
      })

      cy.reload()

      // Deve ter preenchido defaults
      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        expect(data.tenants[0].condoId).to.equal('c1')  // Default
      })
    })
  })

  describe('Clear Data', () => {
    it('deve permitir limpar todos os dados com confirmação', () => {
      // Adicionar dados
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('João')
      cy.get('#tenant-rent').type('1500')
      cy.contains('Salvar').click()

      // Confirmar que tem dados
      cy.contains('João').should('exist')

      // Limpar dados
      cy.contains('Mais').click()
      cy.contains('Limpar Tudo').click()
      cy.contains('Tem certeza?').should('exist')
      cy.contains('Confirmar').click()

      // Deve estar vazio
      cy.contains('João').should('not.exist')
      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        expect(data.tenants).to.have.lengthOf(0)
      })
    })

    it('deve permitir cancelar limpeza de dados', () => {
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Maria')
      cy.get('#tenant-rent').type('2000')
      cy.contains('Salvar').click()

      cy.contains('Mais').click()
      cy.contains('Limpar Tudo').click()
      cy.contains('Cancelar').click()

      // Dados devem estar preservados
      cy.contains('Maria').should('exist')
    })
  })

  describe('Corruption Detection', () => {
    it('deve recuperar se localStorage estiver corrupto', () => {
      cy.window().then((win) => {
        // Dados corrompidos
        win.localStorage.setItem('gestao_alugueis_v1', '{invalid json}')
      })

      cy.reload()

      // Deve limpar e começar do zero
      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        expect(data).to.exist
        expect(data.tenants).to.be.an('array')
      })
    })

    it('deve alertar usuário de corrupção de dados', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('gestao_alugueis_v1', 'corrupted')
      })

      cy.reload()

      cy.contains('Erro ao carregar dados').should('exist')
    })
  })
})
