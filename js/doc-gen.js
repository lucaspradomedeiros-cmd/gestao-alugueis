// ============================================================
// DOCUMENTO GENERATION — Advocacia + Contrato Aluguel
// ============================================================

async function gerarDocAdv(){
  if(!window.docx||!window.docx.Document){gaToast('Biblioteca docx não carregada. Verifique sua conexão e recarregue a página.','error');return;}
  const c=clientesAdv.find(x=>x.id===_gerarDocClienteId);
  if(!c){gaToast('Cliente não encontrado.','error');return;}
  const tipos=[];
  if(document.getElementById('gd-chk-proc').checked) tipos.push('procuracao');
  if(document.getElementById('gd-chk-hon').checked)  tipos.push('honorarios');
  if(document.getElementById('gd-chk-hipo').checked) tipos.push('hipossuficiencia');
  if(document.getElementById('gd-chk-recibo').checked) tipos.push('recibo');
  if(!tipos.length){gaToast('Selecione ao menos um documento.','error');return;}

  const d={
    clientes:[c],
    tipoAcao:document.getElementById('gd-tipo-acao').value,
    localAssinatura:document.getElementById('gd-local').value||'Campo Grande/MS',
    dataAssinatura:document.getElementById('gd-data').value,
    poderesProcuracao:document.getElementById('gd-poderes').value,
    honorariosTotal:document.getElementById('gd-hon-total').value,
    formaPagamento:document.getElementById('gd-forma-pgto').value,
    valorEntrada:document.getElementById('gd-entrada').value,
    numeroParcelas:document.getElementById('gd-nparc').value,
    valorParcela:document.getElementById('gd-vparc').value,
    diaVencimento:document.getElementById('gd-diaVenc').value||'5',
    rendaMensal:document.getElementById('gd-renda').value,
    vinculoEmpregaticio:document.getElementById('gd-vinculo').value,
    imovelProprio:document.getElementById('gd-imovel-prop').value,
    veiculoProprio:document.getElementById('gd-veiculo').value,
    dependentes:document.getElementById('gd-dependentes').value,
    demaisBens:document.getElementById('gd-bens').value,
  };

  const MARGIN_DOC={top:80,right:1134,bottom:567,left:1134};
  const MARGIN_HIPO={top:1418,right:1418,bottom:1418,left:1418};
  const CONTENT_W=11906-1134-1134;

  try{
    fecharGerarDocModal();
    gaToast('Gerando documentos…','success');

    for(const tipo of tipos){
      let blob,nome;
      const nome1=c.nome.split(' ')[0];
      if(tipo==='procuracao'){
        blob=await docxMontar(docBuildProcuracao(d,c),true,MARGIN_DOC);
        nome='Procuracao_'+nome1+'.docx';
      } else if(tipo==='honorarios'){
        blob=await docxMontar(docBuildHonorarios(d,CONTENT_W),true,MARGIN_DOC);
        nome='Honorarios_'+nome1+'.docx';
      } else if(tipo==='hipossuficiencia'){
        blob=await docxMontar(docBuildHipo(d,c),false,MARGIN_HIPO);
        nome='Hipossuficiencia_'+nome1+'.docx';
      } else if(tipo==='recibo'){
        blob=await docxMontar(docBuildRecibo(d),true,MARGIN_DOC);
        nome='Recibo_'+nome1+'.docx';
      }
      docxDownload(blob,nome);
      const cl=clientesAdv.find(x=>x.id===_gerarDocClienteId);
      if(cl){if(!cl.documentos)cl.documentos=[];cl.documentos.push({tipo,geradoEm:Date.now()});}
    }
    saveToStorage();
    renderFichaAdvDocs(clientesAdv.find(x=>x.id===_gerarDocClienteId));
    gaToast('Documentos gerados com sucesso!');
  }catch(e){console.error(e);gaToast('Erro ao gerar: '+e.message,'error');}
}

function docBuildProcuracao(d,c){
  const {run,bold,boldUnder,titleRun,par,centered,justified,spacer}=docxHelpers();
  const {D}=docxHelpers();
  const {TextRun,AlignmentType}=D;
  const FONT='Cambria',SZ=24,SP={line:240,lineRule:'auto',before:0,after:120},SP0={line:240,lineRule:'auto',before:0,after:0};
  let contato='';
  if(c.email&&c.email.trim()) contato+=`, e-mail: ${c.email.trim()}`;
  if(c.telefone&&c.telefone.trim()) contato+=`, telefone: ${c.telefone.trim()}`;
  const qualif=[boldUnder(c.nome),run(`, ${c.nacionalidade||'brasileiro(a)'}, ${c.estadoCivil||''}, ${c.profissao||''}, portador(a) da Cédula de Identidade RG n.º ${c.rg||''}, expedida pelo ${c.rgOrgao||''}, inscrito(a) no CPF/MF sob o n.º ${c.cpf||''}, residente e domiciliado(a) na ${c.endereco||''}, ${c.bairro||''}, ${c.cidade||''}/${c.uf||''}, CEP ${c.cep||''}${contato}.`)];
  return [
    centered([titleRun('P  R  O  C  U  R  A  Ç  Ã  O')],{spacing:{before:240,after:400,line:240,lineRule:'auto'}}),
    par([bold('OUTORGANTE: ')]),
    justified(qualif),spacer(),
    justified([bold('OUTORGADO: '),boldUnder(ADVOGADO_ADV.nome),run(', brasileiro, casado, advogado, inscrito na OAB/MS sob n.º 21.380, com escritório profissional situado à Rua Monte Alegre, nº 1.334, Centro, CEP: 79.824-070, na cidade de Dourados/MS.')]),spacer(),
    justified([run('Os poderes da cláusula '),new TextRun({text:'"extra"',font:FONT,size:SZ,italics:true,bold:true}),run(' e '),new TextRun({text:'"ad judicia"',font:FONT,size:SZ,italics:true,bold:true}),run(`, para representar o(a) Outorgante em juízo, em qualquer instância, grau ou tribunal, podendo propor e contestar ações, interpor recursos de qualquer natureza, produzir provas, assinar petições, requerer, transigir, firmar compromissos ou acordos, desistir, renunciar e substabelecer esta, com ou sem reservas de iguais poderes, e tudo o mais que se fizer necessário ao bom e fiel desempenho do presente mandato, especialmente para: `),boldUnder(d.poderesProcuracao||'representar o(a) Outorgante nos termos da presente procuração'),run('; praticar todos os atos processuais e extrajudiciais necessários; receber citações, intimações e notificações; firmar acordos e transações; substabelecer os poderes ora outorgados, com ou sem reservas.')]),spacer(),
    justified([run('A presente procuração é outorgada pelo prazo necessário ao término do mandato e produz todos os efeitos legais previstos nos arts. 653 e seguintes do Código Civil e no art. 105 do Código de Processo Civil.')]),spacer(),spacer(),
    par([run(`${d.localAssinatura}, ${d.dataAssinatura}.`)],{alignment:AlignmentType.RIGHT}),spacer(),spacer(),
    centered([run('_'.repeat(52))],{spacing:SP0}),
    centered([bold(c.nome)],{spacing:SP0}),
    centered([run(`CPF n.º ${c.cpf||''}`)],{spacing:SP0}),
    centered([run('Outorgante')],{spacing:{...SP0,after:360}}),
  ];
}

function docBuildTabelaHon(d,cW){
  const {D}=docxHelpers();
  const {Table,TableRow,TableCell,Paragraph,TextRun,AlignmentType,WidthType,BorderStyle,ShadingType}=D;
  const FONT='Cambria',SZ=24,SP0={line:240,lineRule:'auto',before:0,after:0};
  const col=Math.floor(cW/2);
  const bNone={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
  const borders={top:bNone,bottom:bNone,left:bNone,right:bNone};
  const hCell=t=>new TableCell({borders,shading:{fill:'1a1a1a',type:ShadingType.CLEAR},margins:{top:80,bottom:80,left:120,right:120},width:{size:col,type:WidthType.DXA},children:[new Paragraph({alignment:AlignmentType.LEFT,spacing:SP0,children:[new TextRun({text:t,font:FONT,size:SZ,bold:true,color:'FFFFFF'})]})]});
  const vCell=t=>new TableCell({borders,shading:{fill:'F5F5F5',type:ShadingType.CLEAR},margins:{top:80,bottom:80,left:120,right:120},width:{size:col,type:WidthType.DXA},children:[new Paragraph({alignment:AlignmentType.LEFT,spacing:SP0,children:[new TextRun({text:t,font:FONT,size:SZ})]})]});
  const linhas=[['Honorários Totais',fmtBRLExtenso(d.honorariosTotal)]];
  if(d.formaPagamento==='avista'){linhas.push(['Forma de Pagamento','À vista — pagamento integral']);}
  else{const te=d.valorEntrada&&d.valorEntrada.trim()!==''&&d.valorEntrada.trim()!=='0';linhas.push(['Forma de Pagamento',`${d.numeroParcelas}x parcelas de R$ ${d.valorParcela}${te?' — com entrada de R$ '+d.valorEntrada:' — sem entrada'}`]);}
  linhas.push(['Meio de Pagamento',`${ADVOGADO_ADV.banco} | ${ADVOGADO_ADV.pix} | Em nome de ${ADVOGADO_ADV.nome_cc}`]);
  return new Table({width:{size:cW,type:WidthType.DXA},rows:linhas.map(([l,v])=>new TableRow({children:[hCell(l),vCell(v)]}))});
}
function docBuildTabelaVenc(d,cW){
  const {D}=docxHelpers();
  const {Table,TableRow,TableCell,Paragraph,TextRun,AlignmentType,WidthType,BorderStyle,ShadingType}=D;
  const FONT='Cambria',SZ_FOOT=20,SP0={line:240,lineRule:'auto',before:0,after:0};
  const c1=Math.floor(cW*.25),c2=Math.floor(cW*.40),c3=cW-c1-c2;
  const bL={style:BorderStyle.SINGLE,size:1,color:'CCCCCC'};const borders={top:bL,bottom:bL,left:bL,right:bL};
  const hdr=(t,w)=>new TableCell({borders,shading:{fill:'2a2a2a',type:ShadingType.CLEAR},margins:{top:60,bottom:60,left:100,right:100},width:{size:w,type:WidthType.DXA},children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:SP0,children:[new TextRun({text:t,font:FONT,size:SZ_FOOT,bold:true,color:'FFFFFF'})]})]});
  const cell=(t,w,shade='FFFFFF')=>new TableCell({borders,shading:{fill:shade,type:ShadingType.CLEAR},margins:{top:60,bottom:60,left:100,right:100},width:{size:w,type:WidthType.DXA},children:[new Paragraph({alignment:AlignmentType.CENTER,spacing:SP0,children:[new TextRun({text:t,font:FONT,size:SZ_FOOT})]})]});
  const mMap={janeiro:0,fevereiro:1,março:2,abril:3,maio:4,junho:5,julho:6,agosto:7,setembro:8,outubro:9,novembro:10,dezembro:11};
  const match=(d.dataAssinatura||'').match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  let base=match?new Date(parseInt(match[3]),mMap[match[2].toLowerCase()]??0,parseInt(match[1])):new Date();
  const diaV=parseInt(d.diaVencimento)||5,nP=parseInt(d.numeroParcelas)||1;
  const temEnt=d.valorEntrada&&d.valorEntrada.trim()!==''&&d.valorEntrada.trim()!=='0';
  const linhas=[];
  if(temEnt)linhas.push({label:'Entrada (ato da assinatura)',valor:`R$ ${d.valorEntrada}`,data:base.toLocaleDateString('pt-BR')});
  for(let i=0;i<nP;i++){const dt=new Date(base.getFullYear(),base.getMonth()+i+1,diaV);linhas.push({label:`${i+1}ª parcela`,valor:`R$ ${d.valorParcela}`,data:dt.toLocaleDateString('pt-BR')});}
  const rows=[new TableRow({children:[hdr('Parcela',c1),hdr('Valor',c2),hdr('Vencimento',c3)]}),
    ...linhas.map((v,i)=>new TableRow({children:[cell(v.label,c1,i%2===0?'F9F9F9':'FFFFFF'),cell(v.valor,c2,i%2===0?'F9F9F9':'FFFFFF'),cell(v.data,c3,i%2===0?'F9F9F9':'FFFFFF')]}))];
  return new Table({width:{size:cW,type:WidthType.DXA},rows});
}

function docBuildHonorarios(d,cW){
  const {run,bold,boldUnder,titleRun,par,centered,justified,spacer}=docxHelpers();
  const {D}=docxHelpers();
  const {AlignmentType}=D;
  const SP={line:240,lineRule:'auto',before:0,after:120},SP0={line:240,lineRule:'auto',before:0,after:0};
  const isAv=d.formaPagamento==='avista';
  const secao=t=>par([bold(t)],{spacing:{...SP,before:160}});
  const EXTENSO=['Primeira','Segunda','Terceira','Quarta','Quinta','Sexta','Sétima','Oitava','Nona','Décima','Décima Primeira','Décima Segunda'];
  let clN=0;
  const cl=texto=>justified([bold(`Cláusula ${EXTENSO[clN++]} — `),run(texto)]);
  const pu=texto=>justified([bold('Parágrafo Único — '),run(texto)]);
  const pg=(n,texto)=>justified([bold(`§ ${n}º — `),run(texto)]);
  const c=d.clientes[0];
  const temEnt=d.valorEntrada&&d.valorEntrada.trim()!==''&&d.valorEntrada.trim()!=='0';
  return [
    centered([titleRun('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE')],{spacing:{before:240,after:0,line:240,lineRule:'auto'}}),
    centered([titleRun('CONSULTORIA JURÍDICA E ADVOCACIA')],{spacing:{before:0,after:480,line:240,lineRule:'auto'}}),
    secao('I — DA QUALIFICAÇÃO DAS PARTES'),spacer(),
    par([bold('CONTRATANTE: ')]),
    justified([boldUnder(c.nome),run(`, ${c.nacionalidade||'brasileiro(a)'}, ${c.estadoCivil||''}, ${c.profissao||''}, portador(a) da Cédula de Identidade RG n.º ${c.rg||''}, expedida pelo ${c.rgOrgao||''}, inscrito(a) no CPF/MF sob o n.º ${c.cpf||''}, residente e domiciliado(a) na ${c.endereco||''}, ${c.bairro||''}, ${c.cidade||''}/${c.uf||''}, CEP ${c.cep||''}${c.email?', e-mail: '+c.email:''}${c.telefone?', telefone: '+c.telefone:''}.`)]),spacer(),
    justified([bold('CONTRATADO: '),boldUnder(ADVOGADO_ADV.nome),run(', brasileiro, casado, advogado regularmente inscrito na Ordem dos Advogados do Brasil seccional de Mato Grosso do Sul sob o número 21.380, com escritório profissional situado na Rua Monte Alegre, nº 1.334, Centro, CEP: 79.824-070, na cidade de Dourados/MS.')]),spacer(),
    secao('II — DO OBJETO CONTRATUAL'),spacer(),
    justified([bold(`Cláusula ${EXTENSO[clN++]} — `),run('O CONTRATADO obriga-se, face à procuração outorgada, a prestar seus serviços profissionais de advocacia na defesa dos direitos do(a) CONTRATANTE para propor a '),boldUnder(d.tipoAcao||''),run('.')]),spacer(),
    pg(1,'As atividades inclusas na prestação de serviço objeto deste instrumento são todas aquelas inerentes à profissão, até segunda instância, quais sejam: prestação de serviços advocatícios na esfera judicial e extrajudicial, elaboração de peças processuais, interposição de recursos, participação em audiências e todos os atos pertinentes para buscar o direito do Contratante.'),spacer(),
    pg(2,'Obriga-se o CONTRATADO a prestar seus serviços profissionais com toda honestidade, zelo e solicitude, obedecendo ao Código de Ética Profissional e aos princípios e regulamentos da Lei nº 8.906/94, prestando esclarecimentos sobre o andamento e resultado do feito, sempre que solicitado, até a segunda instância.'),spacer(),
    secao('III — DOS HONORÁRIOS PROFISSIONAIS'),spacer(),
    cl('O presente contrato considera o histórico pré-existente entre Contratante e Contratado, bem como o realizável, sendo que os honorários contratuais obedecerão aos seguintes critérios:'),spacer(),
    docBuildTabelaHon(d,cW),spacer(),
    ...(isAv?[]:[justified([bold('Cronograma de Vencimentos:')]),spacer(),docBuildTabelaVenc(d,cW),spacer()]),
    ...(isAv?[pg(1,`Os honorários contratados, no valor de ${fmtBRLExtenso(d.honorariosTotal)}, serão pagos à vista na data de assinatura do presente instrumento, mediante transferência bancária ou PIX para os dados constantes da tabela acima.`),spacer()]:[pg(1,`Os honorários contratados, no valor total de ${fmtBRLExtenso(d.honorariosTotal)}, serão pagos ${temEnt?`mediante pagamento de entrada no valor de ${fmtBRLExtenso(d.valorEntrada)} na data da assinatura, com o saldo restante dividido em ${d.numeroParcelas} (${numExtensoDoc(d.numeroParcelas)}) parcelas mensais e sucessivas de ${fmtBRLExtenso(d.valorParcela)} cada, com vencimento todo dia ${d.diaVencimento} de cada mês, conforme cronograma constante da tabela acima`:`em ${d.numeroParcelas} (${numExtensoDoc(d.numeroParcelas)}) parcelas mensais e sucessivas de ${fmtBRLExtenso(d.valorParcela)} cada, com vencimento todo dia ${d.diaVencimento} de cada mês, conforme cronograma constante da tabela acima`}.`),spacer()]),
    pg(2,'O direito aos honorários contratuais permanecerá integralmente assegurado independentemente do desfecho da demanda, sendo devidos mesmo que a ação seja desistida, arquivada por qualquer motivo processual, extinta sem resolução do mérito ou impedida por força maior.'),spacer(),
    pg(3,'No caso de interposição de recursos, os honorários relativos à interposição e sustentação serão contratados e cobrados de forma separada, com base no piso mínimo estabelecido na tabela de honorários da OAB/MS.'),spacer(),
    pg(4,'O atraso no pagamento de qualquer parcela sujeitará o(a) CONTRATANTE à imediata exigibilidade das parcelas remanescentes, com vencimento antecipado, independentemente de notificação. Incidirá multa moratória de 20% (vinte por cento) sobre o total das parcelas vincendas e vencidas, acrescida de juros moratórios de 1% (um por cento) ao mês e correção monetária pelo IGP-M/FGV.'),spacer(),
    pg(5,'O presente negócio processual foi celebrado de forma livre, informada e assistida. Caso o(a) CONTRATANTE deixe de cumprir qualquer obrigação de pagar, fica autorizada desde já a penhora de até 30% do salário/vencimento, abrindo-se mão da impenhorabilidade salarial até esse limite.'),spacer(),
    pg(6,'Na hipótese de obtenção de sentença favorável, em consonância com os arts. 22 a 26 da Lei Federal n° 8.906/94, os honorários que a parte contrária ficar obrigada a pagar pertencerão na sua totalidade ao CONTRATADO.'),spacer(),
    secao('IV — DAS DESPESAS'),spacer(),
    cl('As despesas com locomoção serão ressarcidas conforme a tabela da OAB/MS.'),spacer(),
    pg(1,'Os deslocamentos fora da sede profissional ensejarão diária no valor fixo de R$ 1.239,18 (mil duzentos e trinta e nove reais e dezoito centavos), independentemente das despesas de transporte, alimentação ou hospedagem.'),spacer(),
    pg(2,'As despesas de cópias e impressões serão cobradas a R$ 2,00 (dois reais) por página.'),spacer(),
    secao('V — DAS PROVAS E DAS RESPONSABILIDADES'),spacer(),
    cl('O(a) CONTRATANTE obriga-se a: providenciar todos os documentos e informações solicitados; comunicar imediatamente qualquer mudança de endereço, telefone ou e-mail; e pagar todas as despesas derivadas da causa, tais como custas processuais, honorários periciais e honorários advocatícios da parte contrária em caso de sucumbência.'),spacer(),
    pu('A inobservância de qualquer cláusula deste instrumento isenta o profissional contratado de qualquer infração ética ou ressarcimento por dano. Na hipótese de comprovação de culpa do profissional, o ressarcimento ficará limitado ao valor dos honorários contratuais mínimos previstos na tabela da OAB/MS.'),spacer(),
    secao('VI — DA DURAÇÃO'),spacer(),
    cl('O presente contrato terá vigência condicionada ao término da providência contratada e descrita na Cláusula Segunda.'),spacer(),
    secao('VII — DA NEGATIVA DE RELAÇÃO DE EMPREGO'),spacer(),
    cl('A presente contratação não se confunde com relação empregatícia, significando tão somente prestação de serviços.'),spacer(),
    pu('O(a) CONTRATANTE reconhece que os honorários têm caráter de verba alimentar, gozando de preferência em eventual execução.'),spacer(),
    secao('VIII — DA COMUNICAÇÃO E CIÊNCIA PROCESSUAL'),spacer(),
    cl('As comunicações entre as partes dar-se-ão preferencialmente por escrito, via e-mail ou WhatsApp, considerando-se cientificado o CONTRATANTE após 24 (vinte e quatro) horas do envio da mensagem, ainda que não haja confirmação de leitura.'),spacer(),
    secao('IX — CONTRATAÇÃO DE MEIOS'),spacer(),
    cl('A presente contratação é de meio, não se obrigando o CONTRATADO a garantir resultado eventualmente esperado pelo(a) CONTRATANTE, cuja não-obtenção não implicará em qualquer infração ética ou indenização.'),spacer(),
    secao('X — DO FORO DE ELEIÇÃO'),spacer(),
    cl('Fica eleito o foro da cidade de Campo Grande/MS para dirimir qualquer dúvida ou conflito inerente ao presente contrato.'),spacer(),
    secao('XI — DA FIRMA DESTE CONTRATO'),spacer(),
    cl('As partes, estando de pleno acordo com os termos e condições estabelecidos, firmam este instrumento em 2 (duas) vias de igual teor e forma.'),spacer(),
    pu('As partes reconhecem que este contrato poderá ser assinado por meio de assinatura digital, considerando-a válida e eficaz para todos os fins de direito.'),spacer(),spacer(),
  ];
}

function docBuildHipo(d,c){
  const {run,bold,par,centered,justified,spacer}=docxHelpers();
  const {D}=docxHelpers();
  const {AlignmentType,TextRun}=D;
  const FONT='Cambria',SZ=24,SZf=20,SP0={line:240,lineRule:'auto',before:0,after:0};
  const qualif=[run('Eu, '),bold(c.nome),run(`, ${c.nacionalidade||'brasileiro(a)'}, ${c.estadoCivil||''}, ${c.profissao||''}, portador(a) da Cédula de Identidade RG n.º ${c.rg||''}, expedida pelo ${c.rgOrgao||''}, inscrito(a) no CPF/MF sob o n.º ${c.cpf||''}, residente e domiciliado(a) na ${c.endereco||''}, ${c.bairro||''}, ${c.cidade||''}/${c.uf||''}, CEP ${c.cep||''}.`)];
  return [
    par([new TextRun({text:'DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA',font:FONT,size:SZf*2,bold:true})],{alignment:AlignmentType.CENTER,spacing:{before:240,after:120,line:240,lineRule:'auto'}}),
    par([new TextRun({text:'(Para fins de concessão dos benefícios da Justiça Gratuita — art. 99 do CPC)',font:FONT,size:SZ,italics:true})],{alignment:AlignmentType.CENTER,spacing:{before:0,after:480,line:240,lineRule:'auto'}}),
    justified(qualif),spacer(),
    centered([bold('DECLARO, SOB AS PENAS DA LEI,')]),spacer(),
    justified([run('que não possuo condições de arcar com as custas processuais, honorários periciais e demais despesas do processo, '),bold('sem prejuízo do próprio sustento e de minha família'),run(', razão pela qual requeiro seja-me concedida a gratuidade de justiça nos termos do art. 98 e seguintes do Código de Processo Civil (Lei n.º 13.105/2015).')]),spacer(),
    par([bold('Informações Patrimoniais e de Renda:')]),spacer(),
    justified([bold('Renda mensal bruta aproximada: '),run(d.rendaMensal||'___________________________________________')]),
    justified([bold('Vínculo empregatício/previdenciário: '),run(d.vinculoEmpregaticio||'___________________________________________')]),
    justified([bold('Situação do imóvel: '),run(d.imovelProprio||'___________________________________________')]),
    justified([bold('Situação do veículo: '),run(d.veiculoProprio||'___________________________________________')]),
    justified([bold('Dependentes: '),run(d.dependentes||'___________________________________________')]),
    justified([bold('Demais bens: '),run(d.demaisBens||'___________________________________________')]),spacer(),
    justified([run('Declaro ainda estar ciente de que a falsidade da presente declaração configura crime previsto no art. 299 do Código Penal, sujeitando-me às sanções penais e à revogação do benefício concedido, conforme o art. 100 do CPC.')]),
  ];
}

function docBuildRecibo(d){
  const {run,bold,boldUnder,par,centered,justified,spacer}=docxHelpers();
  const {D}=docxHelpers();
  const {AlignmentType,TextRun}=D;
  const FONT='Cambria',SZt=32,SP0={line:240,lineRule:'auto',before:0,after:0};
  const c=d.clientes[0];
  const isAv=d.formaPagamento==='avista';
  const temEnt=!isAv&&d.valorEntrada&&d.valorEntrada.trim()!==''&&d.valorEntrada.trim()!=='0';
  let valorRecibo,descPgto;
  if(isAv){valorRecibo=fmtBRLExtenso(d.honorariosTotal);descPgto='pagamento integral à vista';}
  else if(temEnt){valorRecibo=fmtBRLExtenso(d.valorEntrada);descPgto=`entrada do contrato de honorários parcelado em ${d.numeroParcelas}x de R$ ${d.valorParcela}, com vencimento todo dia ${d.diaVencimento}`;}
  else{valorRecibo=fmtBRLExtenso(d.valorParcela);descPgto=`1ª parcela do contrato de honorários parcelado em ${d.numeroParcelas}x de R$ ${d.valorParcela}, com vencimento todo dia ${d.diaVencimento}`;}
  return [
    par([new TextRun({text:'RECIBO DE HONORÁRIOS ADVOCATÍCIOS',font:FONT,size:SZt,bold:true})],{alignment:AlignmentType.CENTER,spacing:{before:240,after:480,line:240,lineRule:'auto'}}),
    justified([bold('Recebi de: '),boldUnder(c.nome),run(`, inscrito(a) no CPF/MF sob o n.º ${c.cpf||''}, a importância de `),bold(valorRecibo),run(`, referente a ${descPgto}, pelos serviços advocatícios prestados no processo de `),boldUnder(d.tipoAcao||'____________'),run('.')]),spacer(),
    justified([run(`Meio de pagamento: ${ADVOGADO_ADV.banco} | ${ADVOGADO_ADV.pix} | Em nome de ${ADVOGADO_ADV.nome_cc}.`)]),spacer(),spacer(),spacer(),
  ];
}

async function gerarContratoAluguel(tenantId){
  if(!window.docx){gaToast('Biblioteca docx ainda carregando, aguarde.','error');return;}
  const t=tenants.find(x=>x.id===tenantId);
  if(!t){gaToast('Locatário não encontrado.','error');return;}
  const im=t.imovelId?getImovel(t.imovelId):null;
  const faltando=[];
  if(!t.cpf) faltando.push('CPF do locatário');
  if(!t.rg) faltando.push('RG do locatário');
  if(!im) faltando.push('Imóvel vinculado');
  if(im&&!im.propCpf) faltando.push('CPF do proprietário (no cadastro do imóvel)');
  if(faltando.length){
    const ok=confirm('Campos em falta para o contrato:\n• '+faltando.join('\n• ')+'\n\nDeseja gerar assim mesmo (com campos em branco)?');
    if(!ok)return;
  }

  try{
    gaToast('Gerando contrato…');
    const blob=await docxBuildContrato(t,im);
    const nome='Contrato_'+t.name.split(' ')[0]+'_'+new Date().toISOString().split('T')[0]+'.docx';
    docxDownload(blob,nome);
    gaToast('Contrato gerado com sucesso!');
  }catch(e){console.error(e);gaToast('Erro ao gerar contrato: '+e.message,'error');}
}

async function docxBuildContrato(t,im){
  const {run,bold,boldUnder,par,centered,justified,spacer}=docxHelpers();
  const {D}=docxHelpers();
  const {AlignmentType,TextRun,BorderStyle}=D;
  const FONT='Cambria',SZt=32,SZ=24,SP={line:240,lineRule:'auto',before:0,after:120},SP0={line:240,lineRule:'auto',before:0,after:0};
  const MARGIN={top:1418,right:1418,bottom:1418,left:1418};

  const hoje=new Date();
  const meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const dataHoje=`${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  const inicio=t.start?new Date(t.start+'T12:00:00'):hoje;
  const fim=t.end?new Date(t.end+'T12:00:00'):null;
  const dataInicio=`${inicio.getDate()} de ${meses[inicio.getMonth()]} de ${inicio.getFullYear()}`;
  const dataFim=fim?`${fim.getDate()} de ${meses[fim.getMonth()]} de ${fim.getFullYear()}`:'—';

  const secao=t=>par([bold(t)],{spacing:{...SP,before:160}});
  const EXTENSO=['Primeira','Segunda','Terceira','Quarta','Quinta','Sexta','Sétima','Oitava','Nona','Décima','Décima Primeira','Décima Segunda'];
  let clN=0;
  const cl=texto=>justified([bold(`Cláusula ${EXTENSO[clN++]} — `),run(texto)]);
  const pu=texto=>justified([bold('Parágrafo Único — '),run(texto)]);
  const pg=(n,texto)=>justified([bold(`§ ${n}º — `),run(texto)]);

  const propNome=im?.propNome||'___________________';
  const propCpf=im?.propCpf||'___________________';
  const propRg=im?.propRg||'___________________';
  const propOrgao=im?.propRgOrgao||'SSP/MS';
  const imEnd=im?.endereco||'___________________';

  const locNome=t.name||'___________________';
  const locCpf=t.cpf||'___________________';
  const locRg=t.rg||'___________________';
  const locOrgao=t.rgOrgao||'SSP/MS';
  const locNac=t.nacionalidade||'brasileiro(a)';
  const locCivil=t.estadoCivil||'solteiro(a)';
  const locProf=t.profissao||'___________________';
  const locEnd=t.endLoc?`${t.endLoc}, ${t.bairroLoc||''}, ${t.cidadeUf||''}, CEP ${t.cepLoc||''}`:imEnd;

  const garantia=t.garantia||'Sem Garantia';
  const fiadores=t.fiadores||[];
  const cidade=im?.endereco?.split('/')?.pop()?.trim()||'Campo Grande/MS';

  const content=[
    par([new TextRun({text:'CONTRATO DE LOCAÇÃO RESIDENCIAL',font:FONT,size:SZt,bold:true})],{alignment:AlignmentType.CENTER,spacing:{before:240,after:480,line:240,lineRule:'auto'}}),
    secao('I — DAS PARTES'),spacer(),
    par([bold('LOCADOR: ')]),
    justified([boldUnder(propNome),run(`, portador(a) do CPF/MF n.º ${propCpf}, RG n.º ${propRg} expedido pelo ${propOrgao}, proprietário(a) do imóvel objeto desta locação.`)]),spacer(),
    par([bold('LOCATÁRIO: ')]),
    justified([boldUnder(locNome),run(`, ${locNac}, ${locCivil}, ${locProf}, portador(a) da Cédula de Identidade RG n.º ${locRg}, expedido pelo ${locOrgao}, inscrito(a) no CPF/MF sob o n.º ${locCpf}, residente e domiciliado(a) na ${locEnd}.`)]),spacer(),
    ...(garantia==='Fiadores'&&fiadores.length>0?[
      par([bold('FIADOR'+(fiadores.length>1?'ES:':': '))]),
      ...fiadores.flatMap((f,i)=>[
        justified([boldUnder(f.nome||'___'),run(`, ${f.profissao||''}, ${f.estadoCivil||''}, portador(a) da Cédula de Identidade RG n.º ${f.rg||''}, expedido pelo ${f.rgOrgao||''}, inscrito(a) no CPF/MF sob o n.º ${f.cpf||''}, residente e domiciliado(a) na ${f.endereco||''}.`)]),
        spacer(),
      ]),
    ]:[]),
    secao('II — DO OBJETO'),spacer(),
    cl(`O LOCADOR cede ao LOCATÁRIO, a título de locação, o imóvel ${im?.tipo||'imóvel'} situado à ${imEnd}${im?.matricula?', matriculado sob n.º '+im.matricula+' no '+im.cartorio:''}${im?.area?', com área de '+im.area+' m²':''}${im?.descricao?', composto de '+im.descricao:''}.`),spacer(),
    secao('III — DO PRAZO'),spacer(),
    cl(`A locação terá início em ${dataInicio} e término em ${dataFim}, pelo prazo determinado. Findo o prazo contratual sem manifestação das partes, a locação converter-se-á automaticamente em prazo indeterminado, podendo ser rescindida mediante notificação prévia de 30 (trinta) dias.`),spacer(),
    secao('IV — DO ALUGUEL'),spacer(),
    cl(`O aluguel mensal é de ${fmtBRLExtenso(t.rent)}, com vencimento todo dia ${t.vencDia||5} (${numExtensoDoc(t.vencDia||5)}) de cada mês, a ser pago por PIX ou transferência bancária.`),spacer(),
    pu(`O não pagamento até o vencimento sujeitará o LOCATÁRIO à multa moratória de 10% (dez por cento) sobre o valor do aluguel, acrescida de juros de mora de 1% (um por cento) ao mês e correção monetária pelo IGPM/FGV.`),spacer(),
    secao('V — DO REAJUSTE'),spacer(),
    cl(`O valor do aluguel será reajustado anualmente pelo índice IGP-M/FGV${t.reajuste?', com o próximo reajuste previsto para '+new Date(t.reajuste+'T12:00:00').toLocaleDateString('pt-BR'):''}. Na ausência de divulgação do índice, aplica-se subsidiariamente o IPCA/IBGE.`),spacer(),
    secao('VI — DAS DESPESAS'),spacer(),
    cl(`São de responsabilidade do LOCATÁRIO: o pagamento de energia elétrica, água e gás, bem como quaisquer despesas ordinárias de condomínio. São de responsabilidade do LOCADOR: IPTU, seguro contra incêndio e despesas extraordinárias de condomínio.`),spacer(),
    secao('VII — DA GARANTIA LOCATÍCIA'),spacer(),
    cl(garantia==='Fiadores'?`A presente locação tem como garantia a fiança prestada pelo(s) FIADOR(ES) qualificado(s) na Cláusula I deste instrumento, que respondem solidariamente por todas as obrigações decorrentes desta locação, inclusive após o término do prazo contratual até a efetiva entrega das chaves.`:garantia==='Seguro Fiança'?`A presente locação tem como garantia o seguro fiança locatício, contratado pelo LOCATÁRIO, com apólice vigente durante todo o período de locação.`:garantia==='Pagamento Antecipado'?`A presente locação tem como garantia o pagamento antecipado de 3 (três) meses de aluguel, conforme ajuste entre as partes.`:`A presente locação não conta com garantia locatícia específica, assumindo o LOCATÁRIO integral responsabilidade pelo cumprimento de todas as cláusulas deste contrato.`),spacer(),
    secao('VIII — DAS OBRIGAÇÕES DO LOCATÁRIO'),spacer(),
    cl(`O LOCATÁRIO obriga-se a: (a) conservar o imóvel em perfeito estado, restituindo-o nas mesmas condições em que o recebeu; (b) não sublocar, ceder ou emprestar o imóvel sem prévia autorização escrita do LOCADOR; (c) comunicar imediatamente ao LOCADOR qualquer dano, vício ou defeito no imóvel; (d) não realizar obras ou modificações sem prévia autorização por escrito; (e) observar as normas do condomínio e a legislação vigente.`),spacer(),
    secao('IX — DAS OBRIGAÇÕES DO LOCADOR'),spacer(),
    cl(`O LOCADOR obriga-se a: (a) entregar o imóvel em boas condições de uso e habitabilidade; (b) garantir ao LOCATÁRIO o uso pacífico do imóvel durante a vigência do contrato; (c) realizar as obras de manutenção estrutural necessárias à habitabilidade; (d) pagar os impostos, taxas e encargos de sua responsabilidade.`),spacer(),
    secao('X — DA MULTA E RESCISÃO'),spacer(),
    cl(`Em caso de rescisão antecipada pelo LOCATÁRIO, será devida multa compensatória equivalente a 3 (três) aluguéis mensais, proporcional ao tempo restante do contrato, nos termos do art. 4º da Lei n.º 8.245/91.`),spacer(),
    pu(`A rescisão antecipada pelo LOCADOR, fora das hipóteses legais, sujeitá-lo-á ao pagamento de multa de igual valor em favor do LOCATÁRIO.`),spacer(),
    secao('XI — DO FORO'),spacer(),
    cl(`Fica eleito o foro da comarca de Campo Grande/MS para dirimir quaisquer dúvidas ou litígios oriundos do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.`),spacer(),
    secao('XII — DAS ASSINATURAS'),spacer(),
    cl(`As partes, por si e por seus herdeiros, firmam o presente contrato em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo identificadas, obrigando-se ao fiel cumprimento de todas as cláusulas e condições aqui estabelecidas.`),spacer(),spacer(),
    par([run(`Campo Grande/MS, ${dataHoje}.`)],{alignment:AlignmentType.RIGHT}),spacer(),spacer(),spacer(),
    centered([run('_'.repeat(52))],{spacing:SP0}),centered([bold(propNome)],{spacing:SP0}),centered([run(`CPF: ${propCpf}`)],{spacing:SP0}),centered([run('Locador')],{spacing:{...SP0,after:680}}),
    centered([run('_'.repeat(52))],{spacing:SP0}),centered([bold(locNome)],{spacing:SP0}),centered([run(`CPF: ${locCpf}`)],{spacing:SP0}),centered([run('Locatário')],{spacing:{...SP0,after:680}}),
    ...fiadores.flatMap(f=>[
      centered([run('_'.repeat(52))],{spacing:SP0}),centered([bold(f.nome||'')],{spacing:SP0}),centered([run(`CPF: ${f.cpf||''}`)],{spacing:SP0}),centered([run('Fiador(a)')],{spacing:{...SP0,after:680}}),
    ]),
    par([run('Testemunha A: ________________________  CPF: _________________')],{spacing:{...SP,after:560}}),
    par([run('Testemunha B: ________________________  CPF: _________________')]),
  ];

  return docxMontar(content,true,MARGIN);
}
