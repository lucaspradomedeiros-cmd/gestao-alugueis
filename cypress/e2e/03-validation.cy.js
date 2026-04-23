describe('03 - Validação de Entrada (Input Validation)', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('Entrar').should('exist')
  })

  describe('CPF Validation', () => {
    it('deve rejeitar CPF inválido em clientes advocatícios', () => {
      cy.contains('Clientes').click()
      cy.contains('Adicionar Cliente').click()

      // CPF inválido (letras)
      cy.get('#cli-cpf').type('abc.def.ghi-jk')
      cy.contains('Salvar Cliente').click()

      // Deve mostrar erro ou impedir salvamento
      cy.get('#cli-cpf').should('have.class', 'error')
    })

    it('deve aceitar CPF válido formatado', () => {
      cy.contains('Clientes').click()
      cy.contains('Adicionar Cliente').click()

      cy.get('#cli-name').type('Empresa Teste')
      cy.get('#cli-cpf').type('12.345.678/0001-90')
      cy.contains('Salvar Cliente').click()

      cy.contains('Empresa Teste').should('exist')
    })

    it('deve limpar formatação e validar CPF', () => {
      cy.contains('Clientes').click()
      cy.contains('Adicionar Cliente').click()

      // Digita sem formatação
      cy.get('#cli-cpf').type('12345678000190')

      // Deve auto-formatar
      cy.get('#cli-cpf').should('have.value', '12.345.678/0001-90')
    })
  })

  describe('CEP Validation', () => {
    it('deve formatar CEP automaticamente', () => {
      cy.contains('Clientes').click()
      cy.contains('Adicionar Cliente').click()

      cy.get('#cli-cep').type('12345678')

      // Deve formatar: 12345-678
      cy.get('#cli-cep').should('have.value', '12345-678')
    })

    it('deve rejeitar CEP com menos de 8 dígitos', () => {
      cy.contains('Clientes').click()
      cy.contains('Adicionar Cliente').click()

      cy.get('#cli-cep').type('1234')
      cy.contains('Salvar Cliente').click()

      cy.contains('CEP inválido').should('exist')
    })
  })

  describe('Data Validation', () => {
    it('deve aceitar datas válidas (YYYY-MM-DD)', () => {
      cy.contains('Clientes').click()
      cy.contains('Adicionar Cliente').click()

      cy.get('#cli-name').type('Empresa Teste')
      cy.get('#cli-data-contratacao').type('2026-04-23')
      cy.contains('Salvar Cliente').click()

      cy.contains('Empresa Teste').should('exist')
    })

    it('deve rejeitar data futura em processo legal', () => {
      cy.contains('Clientes').click()
      cy.get('[data-test="cliente-item"]').first().click()
      cy.contains('Adicionar Processo').click()

      // Tenta data 1 ano no futuro
      cy.get('#proc-vencimento').type('2027-04-23')
      cy.contains('Avisar sobre vencimento futuro').should('exist')
    })

    it('deve formatar data automaticamente', () => {
      cy.contains('Clientes').click()
      cy.contains('Adicionar Cliente').click()

      cy.get('#cli-data-contratacao').type('23042026')

      // Deve formatar: 2026-04-23
      cy.get('#cli-data-contratacao').should('have.value', '2026-04-23')
    })
  })

  describe('Número Validation', () => {
    it('deve aceitar apenas números em rent value', () => {
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-rent').type('abc123')

      // Deve aceitar só números
      cy.get('#tenant-rent').should('have.value', '123')
    })

    it('deve rejeitar aluguel negativo', () => {
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-name').type('João')
      cy.get('#tenant-rent').type('-1500')
      cy.contains('Salvar Inquilino').click()

      cy.contains('Valor não pode ser negativo').should('exist')
    })

    it('deve aceitar aluguel com 2 casas decimais', () => {
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-name').type('João')
      cy.get('#tenant-rent').type('1500.50')
      cy.contains('Salvar Inquilino').click()

      cy.contains('João').should('exist')
    })
  })

  describe('Email Validation', () => {
    it('deve validar formato de email em clientes', () => {
      cy.contains('Clientes').click()
      cy.contains('Adicionar Cliente').click()

      // Email inválido
      cy.get('#cli-email').type('email-invalido')
      cy.contains('Salvar Cliente').click()

      cy.contains('Email inválido').should('exist')
    })

    it('deve aceitar email válido', () => {
      cy.contains('Clientes').click()
      cy.contains('Adicionar Cliente').click()

      cy.get('#cli-name').type('Empresa')
      cy.get('#cli-email').type('contato@empresa.com.br')
      cy.contains('Salvar Cliente').click()

      cy.contains('Empresa').should('exist')
    })
  })

  describe('Telefone Validation', () => {
    it('deve formatar telefone como (11) 98765-4321', () => {
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-phone').type('11987654321')

      // Deve formatar
      cy.get('#tenant-phone').should('have.value', '(11) 98765-4321')
    })

    it('deve aceitar telefone com DDD', () => {
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-phone').type('(21) 99999-8888')
      cy.get('#tenant-name').type('Maria')
      cy.contains('Salvar').click()

      cy.contains('Maria').should('exist')
    })
  })

  describe('Campo Obrigatório', () => {
    it('deve impedir salvar tenant sem nome', () => {
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-rent').type('1500')
      cy.contains('Salvar Inquilino').click()

      cy.contains('Nome é obrigatório').should('exist')
    })

    it('deve impedir salvar inquilino sem condomínio', () => {
      cy.contains('Adicionar Inquilino').click()

      cy.get('#tenant-name').type('João')
      cy.get('#tenant-condo').select('')  // Nenhum selecionado
      cy.contains('Salvar').click()

      cy.contains('Selecione um condomínio').should('exist')
    })

    it('deve impedir salvar despesa sem descrição', () => {
      cy.contains('Financeiro').click()
      cy.contains('Nova Despesa').click()

      cy.get('#desp-valor').type('100')
      cy.contains('Salvar').click()

      cy.contains('Descrição é obrigatória').should('exist')
    })
  })
})
