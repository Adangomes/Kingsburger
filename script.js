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
let cupomAtivo = null;

let itemMestreTemporario = null; 
let saboresSelecionados = [];
let limiteSabores = 0;
let tamanhoSelecionadoGlobal = ""; 

document.addEventListener("DOMContentLoaded", () => {
    carregarStatusLoja();
    carregarCardapioCompleto(); // Agora puxa do JSON
    carregarCarrinhoStorage();
    window.addEventListener("scroll", sincronizarScrollMenu);
});

// --- 1. CARREGAMENTO DO CARDÁPIO VIA JSON LOCAL ---
function carregarCardapioCompleto() {
    const corpo = document.getElementById("cardapio-corpo");
    if (!corpo) return;

    fetch('produtos.json')
        .then(response => {
            if (!response.ok) throw new Error("Erro ao carregar produtos.json");
            return response.json();
        })
        .then(data => {
            // Mapeia os dados do JSON para o padrão do app
            produtosGeral = data.map((p, index) => ({
                id: p.id || index,
                title: p.nome || p.title, 
                price: parseFloat(p.preco || p.price || 0),
                categoria: p.categoria,
                ingredientes: p.ingredientes || "",
                image: p.foto || p.img || p.image || "imagens/placeholder.png",
                prices: p.prices || null,
                ativo: p.ativo !== undefined ? p.ativo : true
            }));

            // Filtra apenas o que está ativo
            produtosGeral = produtosGeral.filter(p => p.ativo);
            
            if (produtosGeral.length > 0) {
                renderizarCardapio();
            } else {
                corpo.innerHTML = "<p class='text-center mt-5'>Cardápio vazio ou em atualização...</p>";
            }
        })
        .catch(error => {
            console.error("Erro:", error);
            corpo.innerHTML = "<p class='text-center mt-5 text-danger'>Erro ao carregar o arquivo de produtos.</p>";
        });
}

// --- SALVAR PEDIDO NO FIREBASE (Mantido para o Admin funcionar) ---
function salvarPedidoFirebase(dados) {
    if (!db) return Promise.resolve();
    const novoPedidoRef = db.ref('pedidos_kings').push();
    const novoId = novoPedidoRef.key;
    localStorage.setItem('ultimoPedidoId', novoId);
    
    const subtotalF = carrinho.reduce((acc, i) => acc + (i.price || 0), 0);
    const taxaF = taxaEntregaCalculada || 0;
    const descF = descontoAplicado || 0;
    const totalF = subtotalF + taxaF - descF;
    
    const cupomTexto = document.getElementById("input-cupom")?.value || "Nenhum";

    return novoPedidoRef.set({
        id: novoId,
        cliente: dados.nome,
        telefone: dados.celular || "Não informado",
        endereco: `${dados.rua}, ${dados.num} - ${dados.bairro}`,
        referencia: document.getElementById("referencia")?.value || "",
        pagamento: dados.pag,
        status: "pendente",
        itens: carrinho.map(item => ({ 
            produto: item.title, 
            qtd: 1, 
            precoUn: item.price 
        })),
        subtotal: subtotalF,
        taxaEntrega: taxaF,
        desconto: descF,
        total: totalF,
        cupom: cupomTexto,
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
}

// --- 2. RENDERIZAÇÃO DO CARDÁPIO ---
function renderizarCardapio() {
    const corpo = document.getElementById("cardapio-corpo");
    const nav = document.getElementById("categorias-scroll");
    
    if(!corpo || !nav) return;

    corpo.innerHTML = "";
    nav.innerHTML = "";

    const categorias = [...new Set(produtosGeral.map(p => p.categoria))].filter(c => c);

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
            // Travas de segurança para Pizzas e Porções
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

// --- FLUXO DE SELEÇÃO (PIZZAS/BURGERS) ---
function decidirFluxo(nome) {
    const p = produtosGeral.find(prod => prod.title === nome);
    if (!p) return;
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
    if (idx > -1) { 
        saboresSelecionados.splice(idx, 1); 
    } else if (saboresSelecionados.length < limiteSabores) {
        if (limiteSabores === 1) saboresSelecionados = [];
        saboresSelecionados.push(nome);
    }
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

// --- 4. ENTREGA E GEO ---
async function processarResumoGeo() {
    const nome = document.getElementById("nomeCliente")?.value;
    const rua = document.getElementById("rua")?.value;
    const num = document.getElementById("numero")?.value;
    const celularVal = document.getElementById('celularCliente')?.value || "";

    if (!nome || !rua || !num) return alert("Preencha Nome, Rua e Número!");
    if (celularVal.replace(/\D/g, "").length < 10) return alert("Celular inválido!");

    const loader = document.getElementById("loading-geral");
    if (loader) loader.style.display = "flex"; 

    try {
        const query = encodeURIComponent(`${rua}, ${num}, Guaramirim, SC, Brasil`);
        const resp = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_KEY}`);
        const data = await resp.json();

        if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].geometry.coordinates;
            const dist = calcularDistancia(RESTAURANTE_COORD[1], RESTAURANTE_COORD[0], lat, lon);
            taxaEntregaCalculada = TAXA_BASE + (dist * VALOR_POR_KM);
        } else {
            taxaEntregaCalculada = TAXA_BASE;
        }
        mostrarResumoFinal();
    } catch (e) {
        taxaEntregaCalculada = TAXA_BASE;
        mostrarResumoFinal();
    } finally {
        if(loader) loader.style.display = "none";
    }
}

async function enviarPedidoFinal() {
    const nome = document.getElementById("nomeCliente")?.value;
    const celular = document.getElementById("celularCliente")?.value || ""; 
    const rua = document.getElementById("rua")?.value;
    const num = document.getElementById("numero")?.value;
    const bairro = document.getElementById("bairro")?.value;
    const pag = document.getElementById("pagamento")?.value;

    const loader = document.getElementById("loading-geral");
    if (loader) loader.style.display = "flex";

    try {
        await salvarPedidoFirebase({ nome, celular, rua, num, bairro, pag });
        alert("PEDIDO ENVIADO COM SUCESSO!");
        carrinho = [];
        localStorage.removeItem("carrinho");
        location.reload(); 
    } catch (e) {
        alert("Erro ao enviar pedido.");
    } finally {
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
    resumoItens.innerHTML = "";
    let sub = 0;
    carrinho.forEach(i => {
        sub += i.price;
        resumoItens.innerHTML += `<div class="resumo-linha"><span>${i.title}</span> <span>R$ ${i.price.toFixed(2)}</span></div>`;
    });
    const totalFinal = sub + taxaEntregaCalculada - descontoAplicado;
    document.getElementById("resumo-taxa").innerHTML = `Subtotal: R$ ${sub.toFixed(2)}<br>Taxa: R$ ${taxaEntregaCalculada.toFixed(2)}<br>Desconto: -R$ ${descontoAplicado.toFixed(2)}`;
    document.getElementById("resumo-total").innerText = `Total: R$ ${totalFinal.toFixed(2)}`;
    document.getElementById("form-entrega").style.display = "none";
    document.getElementById("resumo-pedido").style.display = "block";
}

// --- AUXILIARES ---
function carregarStatusLoja() {
    const el = document.getElementById("status-loja");
    const agora = new Date();
    const tempo = (agora.getHours() * 60) + agora.getMinutes();
    const aberto = tempo >= 1080 && tempo <= 1430; // Ex: 18h às 23h50
    el.innerText = aberto ? "ABERTO" : "FECHADO";
    el.className = `status ${aberto ? 'aberto' : 'fechado'}`;
}

function abrirCarrinho() { document.getElementById("cart-modal").style.display = "flex"; }
function fecharCarrinho() { document.getElementById("cart-modal").style.display = "none"; }
function fecharModalEntrega() { document.getElementById('delivery-modal').style.display = 'none'; }
function abrirDelivery() { 
    if(carrinho.length === 0) return;
    fecharCarrinho();
    document.getElementById("delivery-modal").style.display = "flex"; 
}
function fecharModalSelecao() { document.getElementById("pizza-options-modal").style.display = "none"; }
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
    if(el) window.scrollTo({ top: el.offsetTop - 140, behavior: "smooth" });
}
function sincronizarScrollMenu() {
    const secoes = document.querySelectorAll(".secao-categoria");
    const botoes = document.querySelectorAll(".cat-item");
    let atual = "";
    secoes.forEach(s => { if (window.pageYOffset >= s.offsetTop - 160) atual = s.getAttribute("id").replace("secao-", ""); });
    botoes.forEach(btn => btn.classList.toggle("active", btn.getAttribute("data-categoria") === atual));
}

// --- FIREBASE INIT ---
const db = firebase.database();

function mostrarTela(tela) {
    const cardapio = document.getElementById('cardapio-corpo');
    const categorias = document.getElementById('categorias-nav');
    const pedidos = document.getElementById('view-pedidos');
    const header = document.querySelector('.header');
    if (tela === 'inicio') {
        cardapio.style.display = 'block'; categorias.style.display = 'block'; header.style.display = 'block'; pedidos.style.display = 'none';
    } else {
        cardapio.style.display = 'none'; categorias.style.display = 'none'; header.style.display = 'none'; pedidos.style.display = 'block';
        carregarStatusTempoReal();
    }
}

function carregarStatusTempoReal() {
    const container = document.getElementById('lista-pedidos-cliente');
    const ultimoId = localStorage.getItem('ultimoPedidoId');
    if (!ultimoId) return;
    db.ref('pedidos_kings/' + ultimoId).on('value', (snapshot) => {
        const d = snapshot.val(); if (!d) return;
        container.innerHTML = `<div class="text-center"><h4>Status: ${d.status.toUpperCase()}</h4><p>Total: R$ ${d.total.toFixed(2)}</p></div>`;
    });
}

function mascaraCelular(input) {
    let v = input.value.replace(/\D/g, "");
    if (v.length > 2) v = "(" + v.slice(0,2) + ") " + v.slice(2);
    if (v.length > 9) v = v.slice(0,10) + "-" + v.slice(10);
    input.value = v.slice(0, 15);
}
