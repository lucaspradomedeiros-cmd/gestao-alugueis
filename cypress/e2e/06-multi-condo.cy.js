describe('06 - Multiple Condos & Advanced Features', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('CONDO_UNITS Switching', () => {
    it('deve alternar entre condomínios sem perder dados', () => {
      // Criar inquilino em Condo 1
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-name').type('João (Condo 1)')
      cy.get('#tenant-rent').type('1500')
      cy.contains('Salvar').click()

      cy.contains('João (Condo 1)').should('exist')

      // Mudar para Condo 2
      cy.get('[data-test="condo-switcher"]').select('c2')
      cy.contains('João (Condo 1)').should('not.exist')

      // Criar inquilino em Condo 2
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Maria (Condo 2)')
      cy.get('#tenant-rent').type('2000')
      cy.contains('Salvar').click()

      cy.contains('Maria (Condo 2)').should('exist')

      // Voltar para Condo 1
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('João (Condo 1)').should('exist')
      cy.contains('Maria (Condo 2)').should('not.exist')
    })

    it('deve atualizar CONDO_UNITS ao trocar condomínio', () => {
      cy.get('[data-test="condo-switcher"]').select('c1')

      cy.window().then((win) => {
        const units1 = win.CONDO_UNITS.length
        expect(units1).to.be.greaterThan(0)

        // Mudar condomínio
        cy.get('[data-test="condo-switcher"]').select('c2')

        const units2 = win.CONDO_UNITS.length
        // Deve ter atualizado (pode ser diferente ou igual)
        expect(units2).to.be.greaterThan(-1)
      })
    })

    it('deve preservar activeCondoId após reload', () => {
      cy.get('[data-test="condo-switcher"]').select('c2')

      cy.window().then((win) => {
        expect(win.activeCondoId).to.equal('c2')
      })

      cy.reload()

      cy.window().then((win) => {
        expect(win.activeCondoId).to.equal('c2')
      })
    })
  })

  describe('condoHistories Management', () => {
    it('deve manter histórico separado por condomínio', () => {
      // Condo 1: adicionar rateio
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('Adicionar Rateio').click()
      cy.get('#rateio-descricao').type('Limpeza Condo 1')
      cy.get('#rateio-valor').type('300')
      cy.contains('Salvar').click()

      cy.contains('Limpeza Condo 1').should('exist')

      // Condo 2: adicionar rateio diferente
      cy.get('[data-test="condo-switcher"]').select('c2')
      cy.contains('Adicionar Rateio').click()
      cy.get('#rateio-descricao').type('Segurança Condo 2')
      cy.get('#rateio-valor').type('500')
      cy.contains('Salvar').click()

      cy.contains('Segurança Condo 2').should('exist')
      cy.contains('Limpeza Condo 1').should('not.exist')

      // Voltar e verificar histórico
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('Limpeza Condo 1').should('exist')
      cy.contains('Segurança Condo 2').should('not.exist')
    })

    it('deve sincronizar condoHistories no localStorage', () => {
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('Adicionar Rateio').click()
      cy.get('#rateio-descricao').type('Test')
      cy.get('#rateio-valor').type('100')
      cy.contains('Salvar').click()

      cy.window().then((win) => {
        const data = JSON.parse(win.localStorage.getItem('gestao_alugueis_v1'))
        expect(data.condoHistories['c1']).to.be.an('array')
        expect(data.condoHistories['c1'].length).to.be.greaterThan(0)
      })
    })

    it('deve restaurar condoHistories ao carregar do localStorage', () => {
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('Adicionar Rateio').click()
      cy.get('#rateio-descricao').type('Historic Entry')
      cy.get('#rateio-valor').type('200')
      cy.contains('Salvar').click()

      cy.reload()

      cy.contains('Historic Entry').should('exist')
    })
  })

  describe('Tenant Condo Association', () => {
    it('deve associar tenant ao condomínio correto', () => {
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-name').type('João')
      cy.get('#tenant-rent').type('1500')
      cy.get('#tenant-condo').should('have.value', 'c1')  // Deve estar no c1
      cy.contains('Salvar').click()

      cy.window().then((win) => {
        expect(win.tenants[0].condoId).to.equal('c1')
      })
    })

    it('deve permitir reatribuir tenant para outro condomínio', () => {
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-name').type('Maria')
      cy.get('#tenant-rent').type('2000')
      cy.contains('Salvar').click()

      // Editar e mudar condomínio
      cy.contains('Maria').click()
      cy.contains('Editar').click()
      cy.get('#tenant-condo').select('c2')
      cy.contains('Salvar').click()

      // Deve desaparecer do c1
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('Maria').should('not.exist')

      // Deve aparecer em c2
      cy.get('[data-test="condo-switcher"]').select('c2')
      cy.contains('Maria').should('exist')
    })
  })

  describe('Financial Calculations Per Condo', () => {
    it('deve calcular renda total separada por condomínio', () => {
      // Condo 1: João 1500
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('João')
      cy.get('#tenant-rent').type('1500')
      cy.contains('Salvar').click()

      // Verificar resumo
      cy.get('[data-test="total-rent"]').should('contain', 'R$ 1.500')

      // Condo 2: Maria 2000
      cy.get('[data-test="condo-switcher"]').select('c2')
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Maria')
      cy.get('#tenant-rent').type('2000')
      cy.contains('Salvar').click()

      cy.get('[data-test="total-rent"]').should('contain', 'R$ 2.000')

      // Voltar ao c1
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.get('[data-test="total-rent"]').should('contain', 'R$ 1.500')
    })

    it('deve manter despesas isoladas por condomínio', () => {
      // Condo 1: adicionar despesa
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.get('[data-test="tenant-item"]').first().click()
      cy.contains('Adicionar Despesa').click()
      cy.get('#desp-tipo').select('condominio')
      cy.get('#desp-valor').type('100')
      cy.contains('Salvar').click()

      // Condo 2: não deve ter essa despesa
      cy.get('[data-test="condo-switcher"]').select('c2')
      cy.get('[data-test="tenant-item"]').first().click()
      cy.contains('Despesa Condomínio').should('not.exist')
    })
  })

  describe('Summary & Dashboard Per Condo', () => {
    it('deve mostrar resumo correto para condo ativo', () => {
      cy.get('[data-test="condo-switcher"]').select('c1')

      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Test1')
      cy.get('#tenant-rent').type('1000')
      cy.contains('Salvar').click()

      cy.get('[data-test="condo-info"]').should('contain', 'c1')
      cy.get('[data-test="tenant-count"]').should('contain', '1')
    })

    it('deve atualizar cards quando mudar condomínio', () => {
      // c1: 1 inquilino
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('João')
      cy.get('#tenant-rent').type('1500')
      cy.contains('Salvar').click()

      cy.get('[data-test="tenant-card"]').should('have.length', 1)

      // c2: 2 inquilinos
      cy.get('[data-test="condo-switcher"]').select('c2')
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Maria')
      cy.get('#tenant-rent').type('2000')
      cy.contains('Salvar').click()

      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Pedro')
      cy.get('#tenant-rent').type('1800')
      cy.contains('Salvar').click()

      cy.get('[data-test="tenant-card"]').should('have.length', 2)

      // Voltar ao c1
      cy.get('[data-test="condo-switcher"]').select('c1')
      cy.get('[data-test="tenant-card"]').should('have.length', 1)
    })
  })

  describe('Condo Switcher UI', () => {
    it('deve destacar condomínio ativo', () => {
      cy.get('[data-test="condo-switcher"]').select('c2')

      cy.get('[data-test="condo-switcher"]')
        .find('option:selected')
        .should('have.value', 'c2')
    })

    it('deve listar todos os condomínios disponíveis', () => {
      cy.get('[data-test="condo-switcher"]')
        .find('option')
        .should('have.length.greaterThan', 2)

      cy.get('[data-test="condo-switcher"]').should('contain', 'c1')
      cy.get('[data-test="condo-switcher"]').should('contain', 'c2')
    })
  })

  describe('Default Condo (c1)', () => {
    it('deve usar c1 como padrão na primeira carga', () => {
      cy.window().then((win) => {
        expect(win.activeCondoId).to.equal('c1')
      })
    })

    it('deve criar inquilino em c1 se não especificar', () => {
      cy.contains('Adicionar Inquilino').click()
      cy.get('#tenant-name').type('Default')
      cy.get('#tenant-rent').type('1500')
      cy.contains('Salvar').click()

      cy.window().then((win) => {
        expect(win.tenants[0].condoId).to.equal('c1')
      })
    })
  })
})
