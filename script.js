// --- CONFIGURAÇÕES GLOBAIS ---
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";
const RESTAURANTE_COORD = [-49.024909, -26.464334];
const TAXA_BASE = 5;
const VALOR_POR_KM = 4.0;
const WHATSAPP_NUMERO = "";

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
async function carregarCardapioCompleto() {
    try {
        const res = await fetch("content/produtos.json?v=" + Date.now());
        const data = await res.json();
        produtosGeral = data.produtos;
        renderizarCardapio();
    } catch (e) { console.error("Erro JSON:", e); }
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
    if(!box) return;
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
    const valorDesconto = calcularValorDesconto(sub); 
    descontoAplicado = valorDesconto;
    const totalComDesconto = sub - valorDesconto;
    
    document.getElementById("subtotal").innerText = `R$ ${sub.toFixed(2)}`;
    const feedback = document.getElementById('msg-cupom-feedback');
    if (feedback && valorDesconto > 0) {
        feedback.innerHTML = `Desconto aplicado: - R$ ${valorDesconto.toFixed(2)} ✅`;
        feedback.style.color = "#28a745";
    }
    document.getElementById("total").innerText = `R$ ${totalComDesconto.toFixed(2)}`;
    document.getElementById("cart-count").innerText = carrinho.length;
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function removerItem(idx) {
    carrinho.splice(idx, 1);
    atualizarCarrinho();
}

// --- 4. RESUMO E ENTREGA (GEOAPIFY + LOADING) ---
async function processarResumoGeo() {
    const nome = document.getElementById("nomeCliente")?.value || document.getElementById("input-nome")?.value;
    const rua = document.getElementById("rua")?.value || document.getElementById("input-rua")?.value;
    const num = document.getElementById("numero")?.value || document.getElementById("input-numero")?.value;
    const celularVal = document.getElementById('celularCliente')?.value || "";

    if (!nome || !rua || !num) return alert("Por favor, preencha Nome, Rua e Número para calcular a entrega!");
    
    // Validação de telefone ignorando a máscara
    if (celularVal.replace(/\D/g, "").length < 10) {
        return alert("Por favor, insira um número de celular válido com DDD.");
    }

    const loader = document.getElementById("loading-geral");
    if (loader) loader.style.display = "flex"; 

    try {
        const query = encodeURIComponent(`${rua}, ${num}, Guaramirim, SC, Brasil`);
        const resp = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_KEY}`);
        const data = await resp.json();

        await new Promise(resolve => setTimeout(resolve, 2000));

        if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].geometry.coordinates;
            const dist = calcularDistancia(RESTAURANTE_COORD[1], RESTAURANTE_COORD[0], lat, lon);
            taxaEntregaCalculada = TAXA_BASE + (dist * VALOR_POR_KM);
        } else {
            taxaEntregaCalculada = TAXA_BASE;
        }

        mostrarResumoFinal();

    } catch (e) {
        console.error("Erro ao calcular taxa:", e);
        taxaEntregaCalculada = TAXA_BASE;
        mostrarResumoFinal();
    } finally {
        if(loader) loader.style.display = "none";
    }
}

// --- FUNÇÃO ENVIAR FINAL (FIREBASE) ---
async function enviarPedidoFinal() {
    const nome = document.getElementById("nomeCliente")?.value || document.getElementById("input-nome")?.value;
    const celular = document.getElementById("celularCliente")?.value || ""; 
    const rua = document.getElementById("rua")?.value || document.getElementById("input-rua")?.value;
    const num = document.getElementById("numero")?.value || document.getElementById("input-numero")?.value;
    const bairro = document.getElementById("bairro")?.value || document.getElementById("input-bairro")?.value;
    const pag = document.getElementById("pagamento")?.value;

    if (!nome || !rua) return alert("Por favor, preencha os dados de entrega!");

    const loader = document.getElementById("loading-geral");
    const loaderText = loader?.querySelector("p");
    
    if (loader) {
        loader.style.zIndex = "10000";
        loader.style.display = "flex";
        if (loaderText) loaderText.innerText = "AGUARDE: Processando seu pedido...";
    }

    try {
        // Passamos 'celular' no objeto para o Firebase
        await salvarPedidoFirebase({ nome, celular, rua, num, bairro, pag });

        setTimeout(() => {
            if (loaderText) {
                loaderText.innerHTML = "<strong>PEDIDO ENVIADO COM SUCESSO!</strong><br><span style='font-size: 13px;'>Voltando ao cardápio...</span>";
                loaderText.style.color = "#f37021";
            }
        }, 1500);

        setTimeout(() => {
            carrinho = [];
            localStorage.removeItem("carrinho");
            atualizarCarrinho();
            if (loader) loader.style.display = "none";
            document.getElementById("delivery-modal").style.display = "none";
            document.getElementById("resumo-pedido").style.display = "none";
            document.body.style.overflow = 'auto'; 
            
            const navContainer = document.querySelector('.bottom-nav-container');
            if (navContainer) navContainer.style.display = 'flex';
            
            mostrarTela('inicio'); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 3500);

    } catch (e) {
        console.error("Erro ao salvar pedido:", e);
        alert("Erro de conexão. Tente novamente.");
        if (loader) loader.style.display = "none";
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
    if(!resumoItens) return;

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
    
    document.getElementById("form-entrega").style.display = "none";
    document.getElementById("resumo-pedido").style.display = "block";
}

// --- UTILITÁRIOS E TELAS ---
function carregarStatusLoja() {
    const el = document.getElementById("status-loja");
    if(!el) return;
    const agora = new Date();
    const tempoAtual = (agora.getHours() * 60) + agora.getMinutes();
    const aberto = tempoAtual >= 540 && tempoAtual <= 1410; 
    el.innerText = aberto ? "ABERTO" : "FECHADO";
    el.className = `status ${aberto ? 'aberto' : 'fechado'}`;
}

function fecharModalEntrega() {
    document.getElementById('delivery-modal').style.display = 'none';
    document.body.style.overflow = 'auto'; 
    const nav = document.querySelector('.bottom-nav-container');
    if (nav) nav.style.display = 'flex';
}

function abrirDelivery() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    fecharCarrinho();
    const nav = document.querySelector('.bottom-nav-container');
    if (nav) nav.style.display = 'none';
    document.getElementById("delivery-modal").style.display = "flex";
    document.getElementById("form-entrega").style.display = "block";
    document.getElementById("resumo-pedido").style.display = "none";
    document.body.style.overflow = "hidden"; 
}

function fecharModalSelecao() { 
    document.getElementById("pizza-options-modal").style.display = "none";
    const nav = document.querySelector('.bottom-nav-container');
    if (nav) nav.style.display = 'flex';
}

function fecharCarrinho() { 
    document.getElementById("cart-modal").style.display = "none";
    document.body.style.overflow = 'auto';
    const nav = document.querySelector('.bottom-nav-container');
    if (nav) nav.style.display = 'flex';
}

function abrirCarrinho() { 
    const nav = document.querySelector('.bottom-nav-container');
    if (nav) nav.style.display = 'none';
    document.getElementById("cart-modal").style.display = "flex";
}

function mostrarToast(t) { 
    const el = document.getElementById("toast-geral");
    if(!el) return;
    el.innerText = t + " adicionado! ✅"; el.style.display = "block";
    setTimeout(() => el.style.display = "none", 2000);
}

function carregarCarrinhoStorage() {
    const s = localStorage.getItem("carrinho");
    if (s) { carrinho = JSON.parse(s); atualizarCarrinho(); }
}

function scrollToCategoria(cat) {
    const el = document.getElementById(`secao-${cat}`);
    if(el) window.scrollTo({ top: el.offsetTop - 140, behavior: "smooth" });
}

function sincronizarScrollMenu() {
    const secoes = document.querySelectorAll(".secao-categoria");
    const botoes = document.querySelectorAll(".cat-item");
    let atual = "";
    secoes.forEach(s => { if (window.pageYOffset >= s.offsetTop - 160) atual = s.getAttribute("id").replace("secao-", ""); });
    botoes.forEach(btn => btn.classList.toggle("active", btn.getAttribute("data-categoria") === atual));
}

function voltarParaEntrega() {
    document.getElementById("resumo-pedido").style.display = "none";
    document.getElementById("form-entrega").style.display = "block";
}

// --- FIREBASE ---
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
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        return firebase.database();
    }
    return null;
}
const db = inicializarFirebase();

function salvarPedidoFirebase(dados) {
    if (!db) return Promise.resolve();
    const novoPedidoRef = db.ref('pedidos_kings').push();
    const novoId = novoPedidoRef.key;
    localStorage.setItem('ultimoPedidoId', novoId);
    
    const subtotal = carrinho.reduce((acc, i) => acc + i.price, 0);
    const totalFinal = subtotal + taxaEntregaCalculada - descontoAplicado;
    
    return novoPedidoRef.set({
        id: novoId,
        cliente: dados.nome,
        telefone: dados.celular || "Não informado",
        endereco: `${dados.rua}, ${dados.num} - ${dados.bairro}`,
        bairro: dados.bairro,
        pagamento: dados.pag,
        status: "pendente",
        itens: carrinho.map(item => ({ produto: item.title, qtd: 1, precoUn: item.price })),
        subtotal: subtotal,
        taxaEntrega: taxaEntregaCalculada,
        desconto: descontoAplicado,
        total: totalFinal,
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
}

function mostrarTela(tela) {
    const cardapio = document.getElementById('cardapio-corpo');
    const categorias = document.getElementById('categorias-nav');
    const pedidos = document.getElementById('view-pedidos');
    const header = document.querySelector('.header');
    const navContainer = document.querySelector('.bottom-nav-container');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.body.style.overflow = 'auto';

    if (tela === 'inicio') {
        if(cardapio) cardapio.style.display = 'block';
        if(categorias) categorias.style.display = 'block';
        if(header) header.style.display = 'block';
        if(pedidos) pedidos.style.display = 'none';
        document.querySelector('.nav-item:nth-child(1)')?.classList.add('active');
    } else if (tela === 'pedidos') {
        if(cardapio) cardapio.style.display = 'none';
        if(categorias) categorias.style.display = 'none';
        if(header) header.style.display = 'none'; 
        if(pedidos) pedidos.style.display = 'block';
        document.querySelector('.nav-item:nth-child(2)')?.classList.add('active');
        carregarStatusTempoReal(); 
    }
}

function carregarStatusTempoReal() {
    const container = document.getElementById('lista-pedidos-cliente');
    const ultimoId = localStorage.getItem('ultimoPedidoId');
    if (!ultimoId || !container) {
        if(container) container.innerHTML = `<p class="text-center text-muted">Nenhum pedido hoje.</p>`;
        return;
    }

    firebase.database().ref('pedidos_kings/' + ultimoId).on('value', (snapshot) => {
        const dados = snapshot.val();  
        if (!dados) return;

        let textoStatus = "PENDENTE";
        let corStatus = "#ffc107";
        if(dados.status === 'preparando') { textoStatus = "EM PREPARO"; corStatus = "#0dcaf0"; }
        if(dados.status === 'saiu' || dados.status === 'entrega') { textoStatus = "SAIU PARA ENTREGA"; corStatus = "#f37021"; }
        if(dados.status === 'concluido') { textoStatus = "ENTREGUE"; corStatus = "#198745"; }

        container.innerHTML = `
            <div class="text-center">
                <h4 style="color: ${corStatus}; font-weight: bold;">${textoStatus}</h4>
                <div style="background: #222; padding: 15px; border-radius: 10px; margin-top: 15px; text-align: left;">
                    <p><b>Cliente:</b> ${dados.cliente}</p>
                    <p><b>Total:</b> R$ ${parseFloat(dados.total).toFixed(2)}</p>
                </div>
            </div>`;
    });
}

// --- CUPONS ---
const baseCupons = [
    { "codigo": "SNOOP10", "tipo": "porcentagem", "valor": 10, "ativo": true },
    { "codigo": "DESCONTO5", "tipo": "fixo", "valor": 5, "ativo": true }
];

document.getElementById('btn-aplicar-cupom')?.addEventListener('click', () => {
    const input = document.getElementById('input-cupom');
    const msg = document.getElementById('msg-cupom-feedback');
    const codigo = input.value.trim().toUpperCase();
    const achou = baseCupons.find(c => c.codigo === codigo && c.ativo);

    if (achou) {
        cupomAtivo = achou;
        msg.innerText = `Cupom aplicado! ✅`;
        msg.style.color = "#28a745";
    } else {
        cupomAtivo = null;
        msg.innerText = "Inválido! ❌";
        msg.style.color = "#ff4d4d";
    }
    atualizarCarrinho();
});

function calcularValorDesconto(subtotal) {
    if (!cupomAtivo) return 0;
    return cupomAtivo.tipo === "porcentagem" ? subtotal * (cupomAtivo.valor / 100) : cupomAtivo.valor;
}

// --- MÁSCARA CELULAR ---
function mascaraCelular(input) {
    let v = input.value.replace(/\D/g, "");
    if (v.length > 0) v = "(" + v;
    if (v.length > 3) v = v.slice(0, 3) + ") " + v.slice(3);
    if (v.length > 5) v = v.slice(0, 5) + " " + v.slice(5);
    if (v.length > 10) v = v.slice(0, 10) + "-" + v.slice(10);
    input.value = v.slice(0, 16);
}
