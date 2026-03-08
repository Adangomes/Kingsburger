const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";
const RESTAURANTE_COORD = [-26.464334, -49.024909];
const TAXA_BASE = 0;
const VALOR_POR_KM = 4.00;
const LIMITE_KM = 10;

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

// --- 1. CARREGAMENTO ---
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
    if(!corpo || !nav) return;
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
    document.getElementById("subtotal").innerText = `R$ ${sub.toFixed(2)}`;
    document.getElementById("total").innerText = `R$ ${(sub - descontoAplicado).toFixed(2)}`;
    document.getElementById("cart-count").innerText = carrinho.length;
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function removerItem(idx) {
    carrinho.splice(idx, 1);
    atualizarCarrinho();
}

// --- 4. CÁLCULO DE ENTREGA (GEOAPIFY ULTRA CORRIGIDO) ---
async function processarResumoGeo() {
    const rua = document.getElementById("rua").value;
    const num = document.getElementById("numero").value;
    const bairro = document.getElementById("bairro").value || "";
    // Se você não tiver um campo cidade no HTML, use a cidade do restaurante fixo
    const cidade = document.getElementById("cidade")?.value || "Jaraguá do Sul"; 

    if (!rua || !num) {
        alert("Por favor, preencha Rua e Número!");
        return;
    }

    const loader = document.getElementById("loading-geral");
    if(loader) loader.style.display = "flex";

    try {
        // Montamos o endereço da forma que o GPS entende melhor
        const enderecoCompleto = `${rua}, ${num}, ${bairro}, ${cidade}, SC, Brasil`;
        
        // Adicionamos bias (proximidade) para o GPS focar na sua região
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(enderecoCompleto)}&bias=proximity:${RESTAURANTE_COORD[1]},${RESTAURANTE_COORD[0]}&apiKey=${GEOAPIFY_KEY}`;

        const resp = await fetch(url);
        const data = await resp.json();

        if (!data.features || data.features.length === 0) {
            // Se falhou com o bairro, tentamos uma última vez sem o bairro (mais genérico)
            const urlSimples = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(rua + ", " + num + ", " + cidade)}&apiKey=${GEOAPIFY_KEY}`;
            const resp2 = await fetch(urlSimples);
            const data2 = await resp2.json();
            
            if(!data2.features || data2.features.length === 0) {
                alert("Endereço não localizado. Tente digitar apenas o nome da rua e o número.");
                if(loader) loader.style.display = "none";
                return;
            }
            processarResultadoGPS(data2.features[0], loader);
        } else {
            processarResultadoGPS(data.features[0], loader);
        }

    } catch (erro) {
        console.error("Erro GPS:", erro);
        alert("Erro na conexão com o GPS.");
        if(loader) loader.style.display = "none";
    }
}

function processarResultadoGPS(feature, loader) {
    const [lonDest, latDest] = feature.geometry.coordinates;
    const distancia = calcularDistancia(RESTAURANTE_COORD[0], RESTAURANTE_COORD[1], latDest, lonDest);

    if (distancia > LIMITE_KM) {
        alert(`Distância de ${distancia.toFixed(1)}km está fora da nossa área de entrega (${LIMITE_KM}km).`);
        if(loader) loader.style.display = "none";
        return;
    }

    taxaEntregaCalculada = TAXA_BASE + (distancia * VALOR_POR_KM);
    taxaEntregaCalculada = Number(taxaEntregaCalculada.toFixed(2));
    
    if(loader) loader.style.display = "none";
    mostrarResumoFinal();
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// --- 5. RESUMO E WHATSAPP ---
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
    document.getElementById("resumo-taxa").innerHTML = `Subtotal: R$ ${sub.toFixed(2)}<br>Taxa: R$ ${taxaEntregaCalculada.toFixed(2)}`;
    document.getElementById("resumo-total").innerText = `Total: R$ ${totalFinal.toFixed(2)}`;
    document.getElementById("form-entrega").style.display = "none";
    document.getElementById("resumo-pedido").style.display = "block";
}

function enviarWhatsApp() {
    const nome = document.getElementById("nomeCliente").value;
    const rua = document.getElementById("rua").value;
    const num = document.getElementById("numero").value;
    const pag = document.querySelector('input[name="pagamento"]:checked')?.value || "Não informado";
    
    let sub = carrinho.reduce((acc, i) => acc + i.price, 0);
    let total = sub + taxaEntregaCalculada;

    let txt = `*NOVO PEDIDO*\n\n*Cliente:* ${nome}\n*Endereço:* ${rua}, ${num}\n*Pagamento:* ${pag}\n\n*ITENS:*\n`;
    carrinho.forEach(i => txt += `- ${i.title}\n`);
    txt += `\n*Total:* R$ ${total.toFixed(2)}`;

    const urlZap = `https://api.whatsapp.com/send?phone=5547999999999&text=${encodeURIComponent(txt)}`;
    
    if (typeof salvarPedidoFirebase === 'function') {
        salvarPedidoFirebase({ nome, rua, num, pag }).then(() => {
            localStorage.removeItem("carrinho");
            window.location.href = urlZap;
        });
    } else {
        localStorage.removeItem("carrinho");
        window.location.href = urlZap;
    }
}

// --- AUXILIARES ---
function carregarStatusLoja() {
    const el = document.getElementById("status-loja");
    if(!el) return;
    const h = new Date().getHours();
    const aberto = h >= 18 && h < 23; 
    el.innerText = aberto ? "ABERTO" : "FECHADO";
    el.className = `status ${aberto ? 'aberto' : 'fechado'}`;
}

function abrirDelivery() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    fecharCarrinho();
    document.getElementById("delivery-modal").style.display = "flex";
}

function fecharModalSelecao() { document.getElementById("pizza-options-modal").style.display = "none"; }
function fecharCarrinho() { document.getElementById("cart-modal").style.display = "none"; }
function abrirCarrinho() { document.getElementById("cart-modal").style.display = "flex"; }
function fecharDelivery() { document.getElementById("delivery-modal").style.display = "none"; }

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
        const config = {
            apiKey: "AIzaSyCXA1yP1F-riNkzOX5zJs5gsQ82EzsT7Qg",
            authDomain: "myproject26-10f0e.firebaseapp.com",
            databaseURL: "https://myproject26-10f0e-default-rtdb.firebaseio.com",
            projectId: "myproject26-10f0e"
        };
        if (!firebase.apps.length) firebase.initializeApp(config);
        return firebase.database();
    }
    return null;
}
const db = inicializarFirebase();
function salvarPedidoFirebase(dados) {
    if (!db) return Promise.resolve();
    return db.ref('pedidos').push({ ...dados, itens: carrinho, total: (carrinho.reduce((acc,i)=>acc+i.price,0)+taxaEntregaCalculada) });
}
