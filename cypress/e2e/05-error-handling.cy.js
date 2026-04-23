describe('05 - Error Handling & Resilience', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('Drive Connection Errors', () => {
    it('deve gracefully degradar para offline quando Drive falha', () => {
      // Simular falha de Drive
      cy.window().then((win) => {
        win.driveConnected = false
      })

      // Criar dados
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('João')
      cy.get('#tenant-rent').type('1500')
      cy.contains('Salvar Inquilino').click()

      // Deve avisar que está usando apenas localStorage
      cy.get('[data-test="save-status"]').should('contain', 'Local')
    })

    it('deve reconnectar automaticamente após Drive voltar', () => {
      // Desconectar Drive
      cy.window().then((win) => {
        win.driveConnected = false
      })

      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Test')
      cy.get('#tenant-rent').type('1000')
      cy.contains('Salvar').click()

      // Reconectar Drive
      cy.window().then((win) => {
        win.onDriveConnected()
      })

      // Deve sincronizar automaticamente
      cy.get('[data-test="save-status"]').should('contain', 'Drive')
    })

    it('deve manter dados em localStorage enquanto Drive sincroniza', () => {
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Maria')
      cy.get('#tenant-rent').type('2000')
      cy.contains('Salvar').click()

      // Mesmo se Drive demorar, localStorage deve estar ok
      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        expect(data.tenants).to.have.lengthOf(1)
        expect(data.tenants[0].name).to.equal('Maria')
      })
    })
  })

  describe('Network Timeout', () => {
    it('deve timeout gracefully em chamadas Google API', () => {
      // Simular timeout
      cy.window().then((win) => {
        const originalFetch = win.fetch
        win.fetch = () => new Promise(() => {}) // Never resolves
      })

      cy.contains('Conectar Drive').click()

      // Depois de 30s deve mostrar timeout
      cy.get('[data-test="error-message"]', { timeout: 35000 })
        .should('contain', 'timeout')
        .or.contain('falha')
    })

    it('deve permitir retry após timeout', () => {
      // Timeout na primeira tentativa
      cy.contains('Conectar Drive').click()
      cy.get('[data-test="error-message"]', { timeout: 35000 }).should('exist')

      // Retry deve funcionar
      cy.contains('Tentar Novamente').click()
      cy.get('[data-test="save-status"]').should('exist')
    })
  })

  describe('Data Validation Errors', () => {
    it('deve rejeitar valores negativos em aluguel', () => {
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-name').type('João')
      cy.get('#tenant-rent').type('-1500')
      cy.contains('Salvar').click()

      cy.get('[data-test="error-alert"]').should('contain', 'negativo')
    })

    it('deve rejeitar datas inválidas', () => {
      cy.contains('Financeiro').click()
      cy.contains('Nova Despesa').click()

      cy.get('#desp-descricao').type('Internet')
      cy.get('#desp-valor').type('100')
      cy.get('#desp-data').type('2026-13-45')  // Inválida
      cy.contains('Salvar').click()

      cy.get('[data-test="error-alert"]').should('contain', 'data')
    })

    it('deve rejeitar CPF inválido em advocacia', () => {
      cy.contains('Clientes').click()
      cy.contains('Adicionar Cliente').click()

      cy.get('#cli-name').type('Empresa')
      cy.get('#cli-cpf').type('11111111111111')  // Todos iguais
      cy.contains('Salvar').click()

      cy.get('[data-test="error-alert"]').should('contain', 'CPF')
    })
  })

  describe('Concurrency & Race Conditions', () => {
    it('deve evitar salvar duplicatas ao clicar 2x em Salvar', () => {
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-name').type('João')
      cy.get('#tenant-rent').type('1500')

      // Clica 2x rapidamente
      cy.contains('Salvar Inquilino').click()
      cy.contains('Salvar Inquilino').click()

      cy.wait(2000)

      // Deve ter apenas 1 inquilino
      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        const joaoCount = data.tenants.filter(t => t.name === 'João').length
        expect(joaoCount).to.equal(1)
      })
    })

    it('deve sincronizar corretamente ao editar e salvar no Drive simultaneamente', () => {
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Maria')
      cy.get('#tenant-rent').type('2000')
      cy.contains('Salvar').click()

      // Editar
      cy.contains('Maria').click()
      cy.contains('Editar').click()
      cy.get('#tenant-rent').clear().type('2500')

      // Salvar enquanto Drive sincroniza
      cy.contains('Salvar').click()
      cy.wait(1000)

      // Deve ter valor correto
      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        expect(data.tenants[0].rentValue).to.equal(2500)
      })
    })
  })

  describe('Memory Leaks', () => {
    it('não deve vazar listeners ao abrir/fechar modais várias vezes', () => {
      cy.window().then((win) => {
        const initialListeners = win.addEventListener.length || 0

        for (let i = 0; i < 10; i++) {
          cy.contains('Adicionar Inquilino').click()
          cy.contains('Cancelar').click()
        }

        cy.window().then((win2) => {
          const finalListeners = win2.addEventListener.length || 0
          // Não deve crescer muito
          expect(finalListeners - initialListeners).to.be.lessThan(5)
        })
      })
    })
  })

  describe('Large Data Sets', () => {
    it('deve performar com 100+ inquilinos', () => {
      cy.window().then((win) => {
        const largeDataSet = {
          tenants: Array.from({ length: 100 }, (_, i) => ({
            id: `t${i}`,
            name: `Inquilino ${i}`,
            condoId: 'c1',
            rentValue: 1500 + i * 10,
            rentDay: 5
          })),
          version: 4
        }
        win.localStorage.setItem('gestao_alugueis_v1', JSON.stringify(largeDataSet))
      })

      cy.reload()

      // Dashboard deve renderizar rápido
      cy.get('[data-test="tenant-card"]').should('have.length.greaterThan', 20)
    })

    it('deve paginar ou virtualizar lista grande', () => {
      cy.window().then((win) => {
        const largeDataSet = {
          tenants: Array.from({ length: 200 }, (_, i) => ({
            id: `t${i}`,
            name: `Inquilino ${i}`,
            condoId: 'c1',
            rentValue: 1500
          })),
          version: 4
        }
        win.localStorage.setItem('gestao_alugueis_v1', JSON.stringify(largeDataSet))
      })

      cy.reload()

      // Não deve travar
      cy.contains('Painel Geral').should('be.visible')
      cy.get('[data-test="tenant-card"]').first().should('be.visible')
    })
  })

  describe('Browser Storage Quota', () => {
    it('deve alertar quando localStorage está quase cheio', () => {
      cy.window().then((win) => {
        // Simular localStorage quase cheio
        const largeString = 'x'.repeat(4 * 1024 * 1024)  // 4MB
        try {
          win.localStorage.setItem('_large_temp', largeString)
        } catch (e) {
          // Expected
        }
      })

      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Test')
      cy.get('#tenant-rent').type('1000')
      cy.contains('Salvar').click()

      cy.get('[data-test="warning"]').should('contain', 'espaço')
    })
  })

  describe('Rollback on Error', () => {
    it('deve reverter mudanças se salvar falhar', () => {
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('João')
      cy.get('#tenant-rent').type('1500')
      cy.contains('Salvar').click()

      // Editar
      cy.contains('João').click()
      cy.contains('Editar').click()
      cy.get('#tenant-name').clear().type('Maria')

      // Simular erro no save
      cy.window().then((win) => {
        win.saveToStorage = () => { throw new Error('Save failed') }
      })

      cy.contains('Salvar').click()

      // Deve reverter para "João"
      cy.get('#tenant-name').should('have.value', 'João')
    })
  })
})
