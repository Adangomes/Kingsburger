// --- CONFIGURAÇÕES GLOBAIS ---
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";
const RESTAURANTE_COORD = [-26.49624, -49.07919]; 
const TAXA_BASE = 4.0;       // Ajustado para R$ 4,00
const VALOR_POR_KM = 1.50;   // Ajustado para R$ 1,50
const WHATSAPP_NUMERO = "5547997278232";




let carrinho = [];

let produtosGeral = [];

let taxaEntregaCalculada = 0;

let descontoAplicado = 0;



let itemMestreTemporario = null; 

let saboresSelecionados = [];

let limiteSabores = 0;

let tamanhoSelecionadoGlobal = ""; 



document.addEventListener("DOMContentLoaded", () => {

    carregarStatusLoja();

    carregarCardapioCompleto();

    carregarCarrinhoStorage();

    window.addEventListener("scroll", sincronizarScrollMenu);

});



// --- 1. CARREGAMENTO E RENDERIZAÇÃO ---

// --- NOVA VERSÃO: CARREGA DO FIREBASE EM TEMPO REAL ---
async function carregarCardapioCompleto() {
    if (!db) return console.error("Firebase não inicializado!");

    // O .on('value') faz o site atualizar SOZINHO se você mudar algo no Admin
    db.ref('cardapio/produtos').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Garante que 'produtosGeral' seja sempre uma lista (array)
            produtosGeral = Array.isArray(data) ? data : Object.values(data);
            renderizarCardapio();
            console.log("Cardápio atualizado via Firebase! ✅");
        } else {
            console.warn("Nenhum dado encontrado no Firebase.");
        }
    });
}


function renderizarCardapio() {

    const corpo = document.getElementById("cardapio-corpo");

    const nav = document.getElementById("categorias-scroll");

    corpo.innerHTML = "";

    nav.innerHTML = "";



    const categorias = [...new Set(produtosGeral.map(p => p.categoria))];



    categorias.forEach((cat, idx) => {

        const btn = document.createElement("button");

        btn.className = `cat-item ${idx === 0 ? 'active' : ''}`;

        btn.innerText = cat.toUpperCase();

        btn.onclick = () => scrollToCategoria(cat);

        btn.setAttribute("data-categoria", cat);

        nav.appendChild(btn);



        const section = document.createElement("section");

        section.className = "secao-categoria";

        section.id = `secao-${cat}`;

        section.innerHTML = `<h2 class="titulo-categoria">${cat.toUpperCase()}</h2>`;



        produtosGeral.filter(p => p.categoria === cat).forEach(p => {

            if (p.categoria === 'porcao' && !p.title.includes("600g") && !p.title.includes("1kg")) return;

            if (p.categoria === 'pizza' && !p.title.includes("PIZZA ")) return;



            const precoExibido = p.price > 0 ? `R$ ${p.price.toFixed(2)}` : "Escolher Opções";



            section.innerHTML += `

                <div class="item-produto-lista" onclick="decidirFluxo('${p.title}')">

                    <div class="info-produto">

                        <h3>${p.title}</h3>

                        <p>${p.ingredientes || ""}</p>

                        <span class="preco-unico">${precoExibido}</span>

                    </div>

                    <div class="foto-produto-lista">

                        <img src="${p.image}" onerror="this.src='imagens/placeholder.png'">

                        <button class="btn-add-lista">+</button>

                    </div>

                </div>`;

        });

        corpo.appendChild(section);

    });

}



// --- 2. LÓGICA DE SELEÇÃO ---

function decidirFluxo(nome) {

    const p = produtosGeral.find(prod => prod.title === nome);

    if (p.categoria === 'pizza' || p.categoria === 'porcao') {

        abrirModalSelecao(nome);

    } else {

        adicionarAoCarrinho(p.title, p.price, "");

    }

}



function abrirModalSelecao(nome) {

    itemMestreTemporario = produtosGeral.find(p => p.title === nome);

    saboresSelecionados = [];

    const modal = document.getElementById("pizza-options-modal");

    document.getElementById("pizza-modal-title").innerText = nome;

    document.getElementById("pergunta-qtd-sabores").style.display = "none";

    document.getElementById("secao-sabores").style.display = "none";



    if (itemMestreTemporario.categoria === 'pizza') {

        if (nome.includes("PIZZA P")) {

            tamanhoSelecionadoGlobal = "P";

            montarListaSabores(1, 'pizza');

        } else {

            document.getElementById("pergunta-qtd-sabores").style.display = "block";

            const max = nome.includes("PIZZA M") ? 2 : 3;

            tamanhoSelecionadoGlobal = nome.includes("PIZZA M") ? "M" : "G";

            const containerBotoes = document.getElementById("botoes-qtd-sabores");

            containerBotoes.innerHTML = "";

            for (let i = 1; i <= max; i++) {

                containerBotoes.innerHTML += `<button class="btn-principal m-1" onclick="montarListaSabores(${i}, 'pizza')">${i} Sabor${i>1?'es':''}</button>`;

            }

        }

    } else {

        tamanhoSelecionadoGlobal = nome.includes("600g") ? "P" : "G";

        montarListaSabores(1, 'porcao');

    }

    modal.style.display = "flex";

}



function montarListaSabores(n, tipo) {

    limiteSabores = n;

    document.getElementById("pergunta-qtd-sabores").style.display = "none";

    document.getElementById("secao-sabores").style.display = "block";

    const grid = document.getElementById("lista-sabores-meia");

    grid.innerHTML = "";

    const opcoes = (tipo === 'pizza') 

        ? produtosGeral.filter(p => p.categoria === 'pizza' && !p.title.includes("PIZZA ")) 

        : produtosGeral.filter(p => p.categoria === 'porcao' && !p.title.includes("600g") && !p.title.includes("1kg"));



    opcoes.forEach(opt => {

        grid.innerHTML += `

            <div class="item-sabor-wizard" onclick="toggleSabor('${opt.title}')">

                <div><strong>${opt.title}</strong><br><small>${opt.ingredientes || ""}</small></div>

                <span class="check-icon">⚪</span>

            </div>`;

    });

}



function toggleSabor(nome) {

    const idx = saboresSelecionados.indexOf(nome);

    if (idx > -1) { saboresSelecionados.splice(idx, 1); } 

    else if (saboresSelecionados.length < limiteSabores) {

        if (limiteSabores === 1) saboresSelecionados = [];

        saboresSelecionados.push(nome);

    }

    document.getElementById("lista-sabores-meia").classList.toggle("limite-atingido", saboresSelecionados.length >= limiteSabores);

    document.querySelectorAll(".item-sabor-wizard").forEach(el => {

        const txt = el.querySelector("strong").innerText;

        const sel = saboresSelecionados.includes(txt);

        el.classList.toggle("selecionado", sel);

        el.querySelector(".check-icon").innerText = sel ? "✅" : "⚪";

    });

}



function confirmarSelecao() {

    if (saboresSelecionados.length === 0) return alert("Selecione uma opção!");

    let precoFinal = 0;

    let tituloItem = itemMestreTemporario.title;

    if (itemMestreTemporario.categoria === 'pizza') {

        precoFinal = itemMestreTemporario.prices[tamanhoSelecionadoGlobal];

        tituloItem += ` (${saboresSelecionados.join("/")})`;

    } else {

        const opt = produtosGeral.find(p => p.title === saboresSelecionados[0]);

        precoFinal = opt.prices[tamanhoSelecionadoGlobal];

        tituloItem += ` - ${saboresSelecionados[0]}`;

    }

    adicionarAoCarrinho(tituloItem, precoFinal, "");

    fecharModalSelecao();

}



// --- 3. CARRINHO ---

function adicionarAoCarrinho(titulo, preco, sabor) {

    carrinho.push({ title: titulo, price: preco, sabor: sabor });

    atualizarCarrinho();

    mostrarToast(titulo);

}



function atualizarCarrinho() {

    const box = document.getElementById("cart-items");

    box.innerHTML = "";

    let sub = 0;

    carrinho.forEach((item, index) => {

        sub += item.price;

        box.innerHTML += `

            <div class="cart-item-row">

                <div style="flex:1">

                    <strong>${item.title}</strong><br>

                    <b style="color: #00a650;">R$ ${item.price.toFixed(2)}</b>

                </div>

                <button onclick="removerItem(${index})" class="btn-excluir-apenas-x">X</button>

            </div>`;

    });

    document.getElementById("subtotal").innerText = `R$ ${sub.toFixed(2)}`;

    document.getElementById("total").innerText = `R$ ${(sub - descontoAplicado).toFixed(2)}`;

    document.getElementById("cart-count").innerText = carrinho.length;

    localStorage.setItem("carrinho", JSON.stringify(carrinho));

}



function removerItem(idx) {

    carrinho.splice(idx, 1);

    atualizarCarrinho();

}



// --- 4. RESUMO E ENTREGA (GEOAPIFY) ---

// --- 4. RESUMO E ENTREGA (GEOAPIFY + LOADING) ---

async function processarResumoGeo() {
    const nome = document.getElementById("nomeCliente")?.value || document.getElementById("input-nome")?.value;
    const rua = document.getElementById("rua")?.value || document.getElementById("input-rua")?.value;
    const num = document.getElementById("numero")?.value || document.getElementById("input-numero")?.value;

    if (!nome || !rua || !num) return alert("Preencha os dados para calcular a entrega!");

    const loader = document.getElementById("loading-geral");
    if (loader) loader.style.display = "flex"; 

    try {
        // --- FILTRO DE REGIÃO (Jaraguá, Guaramirim, Schroeder) ---
        // Definimos um retângulo (lon_min, lat_min, lon_max, lat_max) 
        // que cobre as 3 cidades para a API não buscar em outro estado.
        const boundingBox = "-49.2558,-26.5771,-48.9248,-26.3461"; 
        
        const query = encodeURIComponent(`${rua}, ${num}, Santa Catarina, Brasil`);
        const url = `https://api.geoapify.com/v1/geocode/search?text=${query}&filter=rect:${boundingBox}&apiKey=${GEOAPIFY_KEY}`;

        const resp = await fetch(url);
        const data = await resp.json();

        await new Promise(resolve => setTimeout(resolve, 1500));

        if (data.features && data.features.length > 0) {
            const result = data.features[0].properties;
            const cidadeEncontrada = result.city ? result.city.toLowerCase() : "";

            // Validação extra: verifica se a cidade retornada é uma das três
            const cidadesPermitidas = ["jaraguá do sul", "guaramirim", "schroeder"];
            
            if (!cidadesPermitidas.some(c => cidadeEncontrada.includes(c))) {
                alert("Desculpe! No momento atendemos apenas Jaraguá do Sul, Guaramirim e Schroeder.");
                if (loader) loader.style.display = "none";
                return;
            }

            const [lon, lat] = data.features[0].geometry.coordinates;
            const dist = calcularDistancia(RESTAURANTE_COORD[0], RESTAURANTE_COORD[1], lat, lon);

            let taxaBruta = TAXA_BASE + (dist * VALOR_POR_KM);
            taxaEntregaCalculada = parseFloat(taxaBruta.toFixed(2));
            
            mostrarResumoFinal();
        } else {
            alert("Endereço não encontrado na nossa região de entrega.");
        }

    } catch (e) {
        console.error("Erro:", e);
        taxaEntregaCalculada = TAXA_BASE;
        mostrarResumoFinal();
    } finally {
        if (loader) loader.style.display = "none";
    }
}


// FUNÇÃO PARA ENVIAR (WhatsApp + Local para Firebase)

// --- FUNÇÃO ENVIAR CORRIGIDA ---

function enviarWhatsApp() {

    const nome = document.getElementById("nomeCliente")?.value || document.getElementById("input-nome")?.value;

    const rua = document.getElementById("rua")?.value || document.getElementById("input-rua")?.value;

    const num = document.getElementById("numero")?.value || document.getElementById("input-numero")?.value;

    const bairro = document.getElementById("bairro")?.value || document.getElementById("input-bairro")?.value;

    const pag = document.getElementById("pagamento")?.value || "A combinar";

    const totalMsg = document.getElementById("resumo-total")?.innerText || "";



    if (!nome || !rua) return alert("Preencha os dados de entrega!");



    // 1. MONTAGEM DA MENSAGEM

    let msg = `*NOVO PEDIDO - KINGSBURG*\n`;

    msg += `------------------------------\n`;

    msg += ` *Cliente:* ${nome}\n`;

    msg += ` *Endereço:* ${rua}, ${num}\n`;

    msg += ` *Bairro:* ${bairro}\n`;

    msg += ` *Pagamento:* ${pag}\n`;

    msg += `------------------------------\n`;

    msg += ` *ITENS:*\n`;

    carrinho.forEach(i => msg += `• ${i.title} - R$ ${i.price.toFixed(2)}\n`);

    msg += `------------------------------\n`;

    msg += ` *Taxa de Entrega:* R$ ${taxaEntregaCalculada.toFixed(2)}\n`;

    msg += ` *${totalMsg}*`;



    const urlZap = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMERO}&text=${encodeURIComponent(msg)}`;



    // 2. INTERFACE: Trava o botão para não clicar duas vezes

    const btnWhats = document.querySelector("#resumo-pedido button");

    if(btnWhats) {

        btnWhats.innerText = "PROCESSANDO...";

        btnWhats.disabled = true;

    }



    // 3. FUNÇÃO PARA LIMPAR E REINICIAR O SITE

    const finalizarEVoltarInicio = () => {

        localStorage.removeItem("carrinho"); // Limpa o carrinho no banco do navegador

        window.location.href = urlZap; // Abre o WhatsApp

        

        // Dá um tempo para o celular abrir o Zap e depois reseta o site ao fundo

        setTimeout(() => {

            location.reload(); 

        }, 1500);

    };



    // 4. ENVIO COM SEGURANÇA (FIREBASE + WHATSAPP)

    if (typeof salvarPedidoFirebase === 'function') {

        // Se o Firebase falhar ou demorar mais de 4s, ele envia o Zap do mesmo jeito

        const segurancaTimeout = setTimeout(() => {

            finalizarEVoltarInicio();

        }, 4000);



        salvarPedidoFirebase({ nome, rua, num, bairro, pag })

            .then(() => {

                clearTimeout(segurancaTimeout);

                finalizarEVoltarInicio();

            })

            .catch(err => {

                console.error("Erro Firebase:", err);

                clearTimeout(segurancaTimeout);

                finalizarEVoltarInicio();

            });

    } else {

        finalizarEVoltarInicio();

    }

}

function calcularDistancia(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;

    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +

        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

}



function mostrarResumoFinal() {

    const resumoItens = document.getElementById("resumo-itens");

    if(!resumoItens) return enviarWhatsApp(); // Fallback se não houver tela de resumo



    resumoItens.innerHTML = "";

    let sub = 0;

    carrinho.forEach(i => {

        sub += i.price;

        resumoItens.innerHTML += `<div class="resumo-linha"><span>${i.title}</span> <span>R$ ${i.price.toFixed(2)}</span></div>`;

    });



    const totalFinal = sub + taxaEntregaCalculada - descontoAplicado;

    document.getElementById("resumo-taxa").innerHTML = `

        Subtotal: R$ ${sub.toFixed(2)}<br>

        Taxa de Entrega: R$ ${taxaEntregaCalculada.toFixed(2)}<br>

        ${descontoAplicado > 0 ? 'Desconto: - R$ '+descontoAplicado.toFixed(2) : ''}

    `;

    document.getElementById("resumo-total").innerText = `Total: R$ ${totalFinal.toFixed(2)}`;

    

    // Troca as telas do modal

    document.getElementById("form-entrega").style.display = "none";

    document.getElementById("resumo-pedido").style.display = "block";

}







// --- OUTROS ---
function carregarStatusLoja() {
    const el = document.getElementById("status-loja");
    if (!db) return;

    db.ref('configuracoes/statusLoja').on('value', (snapshot) => {

        const data = snapshot.val();
        if (!data) return;

        const agora = new Date();

        const diaSemana = agora.getDay(); // 0 = Domingo
        const horaAtual = agora.getHours() * 60 + agora.getMinutes();

        const abertoManual = data.aberto ?? false;
        const dias = data.diasAbertos || [];

        let horarioOk = true;

        if (data.horarioAbertura && data.horarioFechamento) {

            const [hA, mA] = data.horarioAbertura.split(":").map(Number);
            const [hF, mF] = data.horarioFechamento.split(":").map(Number);

            const aberturaMin = hA * 60 + mA;
            const fechamentoMin = hF * 60 + mF;

            horarioOk = horaAtual >= aberturaMin && horaAtual <= fechamentoMin;
        }

        const diaOk = dias.includes(diaSemana);

        const lojaAberta = abertoManual && horarioOk && diaOk;

        // --- ATUALIZA VISUAL ---
        el.innerText = lojaAberta ? "ABERTO" : "FECHADO";
        el.className = `status ${lojaAberta ? 'aberto' : 'fechado'}`;

        // --- BLOQUEIA PEDIDO ---
        const btnPedir = document.querySelector(".btn-finalizar-carrinho");
        if (btnPedir) btnPedir.disabled = !lojaAberta;

        // --- BLOQUEIA CLIQUE NO CARDÁPIO ---
        const itens = document.querySelectorAll(".item-produto-lista");
        itens.forEach(item => {
            item.style.pointerEvents = lojaAberta ? "auto" : "none";
            item.style.opacity = lojaAberta ? "1" : "0.4";
        });

    });
}

function abrirDelivery() {

    if (carrinho.length === 0) return alert("Carrinho vazio!");

    fecharCarrinho();

    document.getElementById("delivery-modal").style.display = "flex";

    document.body.style.overflow = "hidden"; // Fix bug teclado

}



function fecharModalSelecao() { document.getElementById("pizza-options-modal").style.display = "none"; }

function fecharCarrinho() { document.getElementById("cart-modal").style.display = "none"; }

function abrirCarrinho() { document.getElementById("cart-modal").style.display = "flex"; }

function mostrarToast(t) { 

    const el = document.getElementById("toast-geral");

    el.innerText = t + " adicionado! ✅"; el.style.display = "block";

    setTimeout(() => el.style.display = "none", 2000);

}

function carregarCarrinhoStorage() {

    const s = localStorage.getItem("carrinho");

    if (s) { carrinho = JSON.parse(s); atualizarCarrinho(); }

}

function scrollToCategoria(cat) {

    const el = document.getElementById(`secao-${cat}`);

    window.scrollTo({ top: el.offsetTop - 140, behavior: "smooth" });

}

function sincronizarScrollMenu() {

    const secoes = document.querySelectorAll(".secao-categoria");

    const botoes = document.querySelectorAll(".cat-item");

    let atual = "";

    secoes.forEach(s => { if (pageYOffset >= s.offsetTop - 160) atual = s.getAttribute("id").replace("secao-", ""); });

    botoes.forEach(btn => btn.classList.toggle("active", btn.getAttribute("data-categoria") === atual));

}



function voltarParaEntrega() {

    document.getElementById("resumo-pedido").style.display = "none";

    document.getElementById("form-entrega").style.display = "block";

}



// --- CONFIGURAÇÃO FIREBASE (VERSÃO SEGURA) ---

function inicializarFirebase() {

    if (typeof firebase !== 'undefined') {

        const firebaseConfig = {

            apiKey: "AIzaSyCXA1yP1F-riNkzOX5zJs5gsQ82EzsT7Qg",

            authDomain: "myproject26-10f0e.firebaseapp.com",

            databaseURL: "https://myproject26-10f0e-default-rtdb.firebaseio.com",

            projectId: "myproject26-10f0e",

            storageBucket: "myproject26-10f0e.firebasestorage.app",

            messagingSenderId: "884850608032",

            appId: "1:884850608032:web:79db6983346c3c20edc6c5"

        };



        if (!firebase.apps.length) {

            firebase.initializeApp(firebaseConfig);

        }

        return firebase.database();

    }

    return null;

}



const db = inicializarFirebase();



function salvarPedidoFirebase(dados) {

    if (!db) {

        console.error("Firebase não carregado!");

        return Promise.resolve(); // Deixa seguir para o Zap mesmo com erro

    }

    

    const novoPedidoRef = db.ref('pedidos').push();

    return novoPedidoRef.set({

        cliente: dados.nome,

        endereco: `${dados.rua}, ${dados.num} - ${dados.bairro}`,

        referencia: document.getElementById("referencia")?.value || "Não informada",

        pagamento: dados.pag,

        itens: carrinho.map(item => ({

            produto: item.title,

            qtd: 1,

            precoUn: item.price

        })),

        subtotal: carrinho.reduce((acc, i) => acc + i.price, 0),

        taxaEntrega: taxaEntregaCalculada,

        desconto: descontoAplicado,

        total: (carrinho.reduce((acc, i) => acc + i.price, 0) + taxaEntregaCalculada - descontoAplicado),

        horario: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),

        obs_cozinha: document.getElementById("obs-pedido")?.value || "Nenhuma"

    });

}
// FUNÇÃO PARA MIGRAR OS DADOS DO ARQUIVO PARA O FIREBASE
async function migrarArquivoParaFirebase() {
    if (!confirm("Deseja realizar a migração total? (Produtos, Status e Descontos)")) return;

    const btn = event.target;
    const textoOriginal = btn.innerText;
    btn.innerText = "⏳ Migrando Tudo...";
    btn.disabled = true;

    try {
        console.log("Iniciando migração total...");

        // 1. MIGRAR PRODUTOS
        const resProdutos = await fetch("content/produtos.json?v=" + Date.now());
        const dataProdutos = await resProdutos.json();
        if (dataProdutos && dataProdutos.produtos) {
            await db.ref('cardapio/produtos').set(dataProdutos.produtos);
            console.log("Produtos migrados! ✅");
        }

        // 2. MIGRAR STATUS (HORÁRIOS E ABERTO/FECHADO)
        const resStatus = await fetch("content/status.json?v=" + Date.now());
        const dataStatus = await resStatus.json();
        if (dataStatus) {
            await db.ref('configuracoes/geral').set(dataStatus);
            // Atualiza o atalho do status principal para o switch
            await db.ref('configuracoes/statusLoja').set(dataStatus.aberto || dataStatus.statusLoja || false);
            console.log("Status da loja migrado! ✅");
        }

        // 3. MIGRAR CUPONS (APLICARDESCONTO.JSON)
        const resCupons = await fetch("content/aplicardesconto.json?v=" + Date.now());
        const dataCupons = await resCupons.json();
        if (dataCupons && dataCupons.cupons) {
            await db.ref('configuracoes/cupons').set(dataCupons.cupons);
            console.log("Cupons de desconto migrados! ✅");
        }

        alert("Migração Completa! Todos os dados foram sincronizados com o Firebase.");
        
        // Recarrega a visualização no Admin
        carregarProdutos();
        if (typeof monitorarStatusLoja === 'function') monitorarStatusLoja();

    } catch (err) {
        console.error("Erro na migração total:", err);
        alert("Erro ao ler um ou mais arquivos JSON. Verifique a pasta 'content'.");
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}


// --- SISTEMA DE CUPONS E DESCONTO ---

// --- SISTEMA DE CUPONS E DESCONTO (VERSÃO CORRIGIDA) ---
async function aplicarCupom() {
    const inputField = document.getElementById("input-cupom");
    const feedback = document.getElementById("msg-cupom-feedback");
    const btnOk = document.getElementById("btn-aplicar-cupom");
    const codigo = inputField?.value.trim().toUpperCase();

    // Se o cupom já foi aplicado, não faz nada
    if (inputField.disabled) return;

    if (!codigo) {
        feedback.innerText = "Digite um código!";
        feedback.style.color = "red";
        return;
    }

    try {
        const snapshot = await db.ref('configuracoes/cupons').once('value');
        const cupons = snapshot.val();

        if (!cupons) {
            feedback.innerText = "Nenhum cupom ativo.";
            return;
        }

        const listaCupons = Array.isArray(cupons) ? cupons : Object.values(cupons);
        const cupomValido = listaCupons.find(c => c.codigo === codigo && c.ativo === true);

        if (cupomValido) {
            let subtotalAtual = carrinho.reduce((acc, i) => acc + i.price, 0);

            if (cupomValido.tipo === "porcentagem" || cupomValido.tipo === "percentual") {
                descontoAplicado = subtotalAtual * (cupomValido.valor / 100);
            } else {
                descontoAplicado = parseFloat(cupomValido.valor);
            }

            feedback.innerText = `Cupom aplicado: R$ ${descontoAplicado.toFixed(2)} OFF! ✅`;
            feedback.style.color = "#00a650"; // Verde Sucesso
            
            // --- SEGURANÇA: TRAVA O CAMPO PARA USAR APENAS 1 VEZ ---
            inputField.disabled = true;
            btnOk.disabled = true;
            btnOk.style.opacity = "0.5";
            inputField.style.backgroundColor = "#f0f0f0";
            
            atualizarCarrinho();  
        } else {
            feedback.innerText = "Cupom inválido ou expirado. ❌";
            feedback.style.color = "red";
            descontoAplicado = 0;
            atualizarCarrinho();
        }
    } catch (err) {
        console.error("Erro ao validar cupom:", err);
        feedback.innerText = "Erro ao validar. Tente novamente.";
    }
}


// =============================
// CONTROLE DE HORÁRIO DA LOJA
// =============================
let statusLojaAtual = {
    aberto: false,
    horarioAbertura: "00:00",
    horarioFechamento: "00:00",
    diasAbertos: []
};
// Carrega dados do Firebase
db.ref('configuracoes/statusLoja').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    statusLojaAtual = data;
    atualizarStatusVisual();
});
// ----------------------------
// VERIFICA SE A LOJA ESTÁ ABERTA
// ----------------------------
function lojaEstaAbertaAgora() {
    if (!statusLojaAtual.aberto) return false;
    const agora = new Date();
    const diaSemana = agora.getDay();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    const [hA, mA] = statusLojaAtual.horarioAbertura.split(":").map(Number);
    const [hF, mF] = statusLojaAtual.horarioFechamento.split(":").map(Number);
    const aberturaMin = hA * 60 + mA;
    const fechamentoMin = hF * 60 + mF;
    const diaPermitido = statusLojaAtual.diasAbertos.includes(diaSemana);
    const horarioPermitido = minutosAgora >= aberturaMin && minutosAgora <= fechamentoMin;
    return diaPermitido && horarioPermitido;
}
// ----------------------------
// MOSTRAR MODAL DE LOJA FECHADA
// ----------------------------
function mostrarModalFechado() {

    const modal = document.getElementById("modal-fechado");
    if (!modal) return;

    const texto = modal.querySelector("p");

    const abertura = statusLojaAtual.horarioAbertura || "00:00";
    const fechamento = statusLojaAtual.horarioFechamento || "00:00";

    texto.innerHTML = `
    Nosso horário de funcionamento é:<br>
    <strong>Hoje das ${abertura} às ${fechamento}</strong><br>
    Por favor, tente mais tarde.
    `;

    modal.style.display = "flex";
}


/* --- ADICIONAR NO FIM DO SEU SCRIPT (ANTES DE FECHAR A TAG </body>) --- */
(function() {
    // 1. INJEÇÃO DE CSS REALISTA NO HEAD
    const cssStyle = document.createElement('style');
    cssStyle.type = 'text/css';
    cssStyle.innerHTML = `
        /* MODAL OVERLAY REALISTA */
        .kings-roleta-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.95);
            display: none; align-items: center; justify-content: center;
            z-index: 10000; padding: 20px; box-shadow: inset 0 0 100px #000;
        }
        
        /* CONTAINER DE MADEIRA NOBRE */
        .kings-roleta-container {
            position: relative; width: 90vw; max-width: 450px; aspect-ratio: 1 / 1;
            margin: auto; border-radius: 50%;
            border: 15px solid #d4af37; /* Moldura de Ouro */
            box-shadow: 0 15px 50px rgba(0,0,0,0.9), inset 0 0 30px rgba(255,255,255,0.1);
            background: #222; overflow: hidden;
            display: flex; align-items: center; justify-content: center;
        }

        /* O CANVAS (ONDE TODA A MAGIA ACONTECE) */
        #canvas-roleta-kings {
            width: 100%; height: 100%; border-radius: 50%; display: block;
            will-change: transform; transition: transform 7.5s cubic-bezier(0.1, 0, 0, 1);
            background: #111; /* Cor de fundo escura */
        }

        /* EFEITO ULTRA-REALISTA NO CENTRAL HUB (FIXO) */
        .kings-roleta-center-hub {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 20%; height: 20%; min-width: 60px; min-height: 60px;
            background: radial-gradient(circle, #f3f3f3 0%, #a0a0a0 60%, #404040 100%); /* Hub Metal */
            border: 8px solid #d4af37; /* Anel de Ouro */
            border-radius: 50%; z-index: 15;
            box-shadow: 0 0 30px rgba(212, 175, 55, 0.6), inset 0 0 15px #000;
        }

        /* O PONTEIRO FIXO NO TOPO (Vermelho Kings Burger) */
        .kings-roleta-pointer {
            position: absolute; top: -15px; left: 50%; transform: translateX(-50%);
            width: 0; height: 0;
            border-left: 16px solid transparent; border-right: 16px solid transparent;
            border-top: 35px solid #ff0000; /* Vermelho vibrante */
            z-index: 20; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.8));
        }

        /* BOTÕES DE AÇÃO - ESTILO PREMIUM KINGS BURGER */
        .btn-principal-kings-roleta {
            background: #ffc107; color: #000; border: none; padding: 18px; width: 100%;
            border-radius: 12px; font-weight: 800; font-size: 16px; margin-top: 25px;
            cursor: pointer; text-transform: uppercase; transition: transform 0.2s;
        }
        .btn-principal-kings-roleta:hover { transform: scale(1.02); }
        
        #btn-continuar-cardapio-kings-roleta {
            display: none; background: #28a745; color: white; margin-top: 10px;
        }

        /* TEXTO DO RESULTADO - VISÍVEL E LIMPO */
        #resultado-kings-roleta-secao {
            font-family: 'Segoe UI', sans-serif; text-align: center;
            color: white; font-size: 18px; font-weight: bold; margin-top: 20px;
            min-height: 50px; text-shadow: 0 2px 5px rgba(0,0,0,0.7);
        }
    `;
    document.head.appendChild(cssStyle);

    // 2. CONFIGURAÇÕES DA ROLETA PREMIUM (PRÊMIOS REAIS)
    const premiosKingsPremium = [
        { texto: "SEM SORTE", cor: "#121212", valor: 0, tipo: 'fixo' }, // Preto Metálico
        { texto: "R$5,00 DE DESCONTO", cor: "#a81d1d", valor: 5, tipo: 'fixo' }, // Vermelho Snoop (Pode manter ou trocar)
        { texto: "R$10,00 DE DESCONTO", cor: "#ffc107", valor: 10, tipo: 'fixo' }, // Ouro Kings Burger
        { texto: "FOI POR POUCO", cor: "#333333", valor: 0, tipo: 'fixo' }, // Cinza escuro
        { texto: "BATATAS BRINDE", cor: "#28a745", valor: 0, tipo: 'brinde', icone: '' },
        { texto: "ENTREGA GRÁTIS", cor: "#007bff", valor: 0, tipo: 'frete' }
    ];

    let anguloAtualKingsRoleta = 0;
    let premioGanhoKingsRoleta = null;

    // 3. DESENHA A ROLETA NO CANVAS COM TEXTURAS E SOMBRAMENTOS
    function desenharKingsRoletaPremium() {
        const canvas = document.getElementById('canvas-roleta-kings');
        if (!canvas) return;

        // Ajuste de tamanho responsivo
        const size = Math.min(window.innerWidth * 0.8, 450);
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const fatiaRadianos = (2 * Math.PI) / premiosKingsPremium.length;
        const centro = size / 2;

        ctx.clearRect(0, 0, size, size);

        premiosKingsPremium.forEach((p, i) => {
            // Desenha a Fatia (Veludo)
            ctx.beginPath();
            
            // Gradiente para simular textura de veludo e volume
            const veludoGradient = ctx.createLinearGradient(centro, centro -centro, centro, centro + centro);
            veludoGradient.addColorStop(0, p.cor);
            veludoGradient.addColorStop(0.5, darkenColor(p.cor, 15)); // Mais escuro no centro
            veludoGradient.addColorStop(1, p.cor);
            ctx.fillStyle = veludoGradient;

            ctx.moveTo(centro, centro);
            ctx.arc(centro, centro, centro - 5, i * fatiaRadianos, (i + 1) * fatiaRadianos);
            ctx.fill();

            // Desenha o Texto Premium
            ctx.save();
            ctx.translate(centro, centro);
            ctx.rotate(i * fatiaRadianos + fatiaRadianos / 2);
            ctx.textAlign = "right";
            ctx.fillStyle = "white"; // Texto branco para contrastar com o veludo

            // Fonte premium e responsiva
            ctx.font = `bold ${size * 0.05}px Arial`;
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            if (p.icone) {
                ctx.font = `bold ${size * 0.08}px Arial`;
                ctx.fillText(p.icone, centro - 20, size * 0.015);
            } else {
                ctx.fillText(p.texto, centro - 20, size * 0.015);
            }
            ctx.restore();
        });
    }

    // 4. LÓGICA DE GIRO TOTALMENTE INTERATIVA (Não viciada)
    window.girarKingsRoletaPremium = function() {
        if (premioGanhoKingsRoleta) return;

        const btn = document.getElementById('btn-girar-kings-roleta');
        btn.disabled = true;
        btn.innerText = "SORTEANDO...";

        // --- LÓGICA INTERATIVA: Escolha totalmente aleatória de 0 a 5 ---
        const indiceSorteado = Math.floor(Math.random() * premiosKingsPremium.length);

        // Cálculos do ângulo para cair perfeitamente no ponteiro vermelho (Norte)
        const girosExtras = 360 * 10; // Rotação Premium Longa (10 giros)
        const fatiaGraus = 360 / premiosKingsPremium.length;
        const compensacaoPonteiroNorte = 90; 
        const anguloPremio = (indiceSorteado * fatiaGraus) + (fatiaGraus / 2);
        
        // Ângulo final que faz a imagem girar e parar no lugar certo
        const anguloFinalRoleta = anguloAtualKingsRoleta + girosExtras + (360 - anguloPremio) + compensacaoPonteiroNorte;

        // Pega a DIV da imagem e aplica a rotação (usando CSS transition)
        const canvas = document.getElementById('canvas-roleta-kings');
        canvas.style.transform = `rotate(${anguloFinalRoleta}deg)`;

        // Armazena o ângulo para o próximo giro
        anguloAtualKingsRoleta = anguloFinalRoleta;

        setTimeout(() => {
            premioGanhoKingsRoleta = premiosKingsPremium[indiceSorteado];
            exibirResultadoKingsRoletaPremium(premioGanhoKingsRoleta);
        }, 7500); // 7.5s de suspense (duração da transition)
    };

    // 5. EXIBE O RESULTADO NO MODAL
    function exibirResultadoKingsRoletaPremium(premio) {
        const resSecao = document.getElementById('resultado-kings-roleta-secao');
        resSecao.innerHTML = ""; // Limpa

        if (premio.texto === "SEM SORTE" || premio.texto === "FOI POR POUCO") {
            resSecao.innerHTML = `<span style="font-size:18px; color:#aaa;">❌ Não foi dessa vez para a Kings Burger!</span><br><b style="font-size:16px; color:#aaa;">${premio.texto}</b>`;
        } else if (premio.tipo === 'brinde' && premio.texto === 'BATATAS BRINDE') {
             resSecao.innerHTML = `<span style="font-size:20px; color:#28a745;">🎉 PARABÉNS!</span><br><b>VOCÊ GANHOU BATATAS DE ACOMPANHAMENTO! 🍟</b>`;
        } else if (premio.valor > 0 || premio.tipo === 'frete') {
             resSecao.innerHTML = `<span style="font-size:20px; color:#28a745;">🎉 AÍ SIM!</span><br><b>VOCÊ GANHOU ${premio.texto}!</b>`;
        }

        document.getElementById('btn-continuar-cardapio-kings-roleta').style.display = "block";
        document.getElementById('btn-girar-kings-roleta').style.display = "none";
    }

    // 6. INTEGRAÇÃO NO FLUXO PRINCIPAL (ABRE NO LOAD)
    window.abrirKingsRoletaPremium = function() {
        const modal = document.getElementById('kings-roleta-modal-overlay');
        modal.style.display = "flex";

        // Reset de estado
        premioGanhoKingsRoleta = null;
        document.getElementById('resultado-kings-roleta-secao').innerHTML = "";
        document.getElementById('btn-continuar-cardapio-kings-roleta').style.display = "none";
        document.getElementById('btn-girar-kings-roleta').style.display = "block";
        document.getElementById('btn-girar-kings-roleta').innerText = "GIRAR A ROLETA KINGS BURGER!";
        document.getElementById('btn-girar-kings-roleta').disabled = false;

        desenharKingsRoletaPremium();
    };

    // 7. FECHA A ROLETA E VAI PARA O CARDÁPIO
    window.fecharKingsRoletaPremium = function() {
        document.getElementById('kings-roleta-modal-overlay').style.display = 'none';
        
        // Salva o prêmio globalmente para o resumo final (embora hoje seja aleatório)
        window.premioGanhoKingsGlobal = premioGanhoKingsRoleta;
        
        // Se você já tem a lógica de carregar o cardápio, chame-a aqui.
        if (typeof carregarCardapioCompleto === 'function') {
            carregarCardapioCompleto();
        }
    };

    // Função auxiliar para escurecer cores (simular veludo)
    function darkenColor(hex, percent) {
        var num = parseInt(hex.slice(1), 16),
            amt = Math.round(2.55 * percent),
            R = (num >> 16) - amt,
            G = (num >> 8 & 0x00FF) - amt,
            B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

})();

// GATILHO DE ABERTURA NO LOAD (Após 1 segundo)
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof abrirKingsRoletaPremium === 'function') {
            abrirKingsRoletaPremium();
        }
    }, 1000);
});
