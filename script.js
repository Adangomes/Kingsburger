// --- 1. CONFIGURAÇÕES GLOBAIS ---
const ID_LOJA = "kings_burger"; 
const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775"; 

// Coordenadas exatas do Kings Burger (R. 25 de Julho, Vila Nova)
const RESTAURANTE_COORD = { lat: -26.464334, lon: -49.024909 }; 

const TAXA_BASE = 5.00;     // Valor mínimo de entrega
const VALOR_POR_KM = 4.00;  // Valor adicional por cada KM rodado

let carrinho = [];
let taxaEntregaCalculada = 0;
let latDestino = null;
let lonDestino = null;

// Inicialização do Firebase (Versão Compat)
const db = (typeof firebase !== 'undefined') ? firebase.database() : null;

// --- 2. MOTOR DE CÁLCULO DE DISTÂNCIA (Haversine) ---
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

// --- 3. AUTOCOMPLETE DE ENDEREÇO (Geoapify) ---
const inputRua = document.getElementById("rua");
const listaSugestoes = document.getElementById("sugestoes");

if (inputRua) {
    inputRua.addEventListener("input", async function() {
        const valor = this.value;
        if (valor.length < 3) {
            listaSugestoes.innerHTML = "";
            return;
        }

        // Busca focada em Jaraguá do Sul (raio de 10km das coordenadas do restaurante)
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(valor)}&filter=circle:${RESTAURANTE_COORD.lon},${RESTAURANTE_COORD.lat},10000&apiKey=${GEOAPIFY_KEY}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            
            listaSugestoes.innerHTML = "";
            if (data.features) {
                data.features.forEach(f => {
                    const div = document.createElement("div");
                    div.className = "sug";
                    div.style.padding = "10px";
                    div.style.cursor = "pointer";
                    div.style.borderBottom = "1px solid #eee";
                    div.innerText = f.properties.formatted;
                    
                    div.onclick = () => {
                        inputRua.value = f.properties.street || f.properties.name || f.properties.address_line1;
                        document.getElementById("bairro").value = f.properties.district || f.properties.suburb || "";
                        
                        // Salva as coordenadas para o cálculo de frete
                        latDestino = f.properties.lat;
                        lonDestino = f.properties.lon;
                        
                        listaSugestoes.innerHTML = "";
                        document.getElementById("numero").focus();
                    };
                    listaSugestoes.appendChild(div);
                });
            }
        } catch (e) { console.error("Erro autocomplete:", e); }
    });
}

// --- 4. CÁLCULO DA TAXA E RESUMO ---
async function processarResumoGeo() {
    const nome = document.getElementById("nomeCliente").value;
    if (!nome || !latDestino) {
        alert("Por favor, preencha seu nome e selecione o endereço na lista!");
        return;
    }

    // Calcula a distância real
    const distanciaKM = calcularDistancia(
        RESTAURANTE_COORD.lat, 
        RESTAURANTE_COORD.lon, 
        latDestino, 
        lonDestino
    );

    // Lógica da Taxa
    taxaEntregaCalculada = TAXA_BASE + (distanciaKM * VALOR_POR_KM);
    
    // Se for muito perto (menos de 500m), mantém a taxa base
    if (distanciaKM < 0.5) taxaEntregaCalculada = TAXA_BASE;

    const subtotal = carrinho.reduce((acc, p) => acc + p.preco, 0);
    const totalGeral = subtotal + taxaEntregaCalculada;

    const resumoDiv = document.getElementById("resumo");
    resumoDiv.style.display = "block";
    resumoDiv.innerHTML = `
        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 5px solid #ff8c00;">
            <p style="margin:0">Distância aproximada: <b>${distanciaKM.toFixed(2)} km</b></p>
            <p style="margin:0">Taxa de Entrega: <b style="color: #d32f2f;">R$ ${taxaEntregaCalculada.toFixed(2)}</b></p>
            <hr>
            <h4 style="margin:0">Total a pagar: R$ ${totalGeral.toFixed(2)}</h4>
        </div>
    `;
}

// --- 5. ENVIO PARA O FIREBASE ---
function enviarPedidoFirebase() {
    const nome = document.getElementById("nomeCliente").value;
    const tel = document.getElementById("telefone").value;
    const num = document.getElementById("numero").value;
    const bairro = document.getElementById("bairro").value;

    if (!nome || !taxaEntregaCalculada || !num) {
        alert("Calcule o frete e preencha o número da casa antes de enviar!");
        return;
    }

    const subtotal = carrinho.reduce((acc, p) => acc + p.preco, 0);

    const pedido = {
        cliente: nome,
        telefone: tel,
        endereco: `${inputRua.value}, nº ${num} - ${bairro}, Jaraguá do Sul`,
        itens: carrinho,
        subtotal: subtotal,
        taxaEntrega: taxaEntregaCalculada,
        total: subtotal + taxaEntregaCalculada,
        horario: new Date().toLocaleString('pt-BR'),
        status: "Pendente"
    };

    if (db) {
        db.ref(`pedidos/${ID_LOJA}`).push(pedido)
            .then(() => {
                alert("🍔 Pedido enviado para o Kings Burger!");
                localStorage.removeItem("carrinho_kings");
                location.reload();
            })
            .catch(err => {
                console.error(err);
                alert("Erro ao conectar com o banco de dados.");
            });
    } else {
        alert("Erro: Firebase não configurado corretamente.");
    }
}

// --- 6. FUNÇÕES DO CARRINHO (Simulação) ---
// Note: Se você já tem sua lógica de adicionar produtos, 
// apenas garanta que o array 'carrinho' seja populado com {nome, preco}

function addCarrinho(nome, preco) {
    carrinho.push({nome: nome, preco: preco});
    atualizarVisualCarrinho();
}

function atualizarVisualCarrinho() {
    const lista = document.getElementById("carrinho");
    const subtotalEl = document.getElementById("subtotal");
    
    if (lista) {
        lista.innerHTML = carrinho.map(i => `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px">
                <span>${i.nome}</span>
                <span>R$ ${i.preco.toFixed(2)}</span>
            </div>
        `).join("");
    }
    
    const subtotal = carrinho.reduce((acc, i) => acc + i.preco, 0);
    if (subtotalEl) subtotalEl.innerText = `R$ ${subtotal.toFixed(2)}`;
}

function abrirEntrega() {
    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }
    document.getElementById("modalEntrega").style.display = "block";
    window.scrollTo({ top: document.getElementById("modalEntrega").offsetTop, behavior: 'smooth' });
}

// --- 7. CARREGAMENTO INICIAL (Exemplo) ---
const produtosMock = [
    {id: 1, nome: "King Bacon", preco: 28.90},
    {id: 2, nome: "King Duplo", preco: 34.00},
    {id: 3, nome: "Batata M", preco: 12.00}
];

window.onload = () => {
    const container = document.getElementById("lista-produtos");
    if (container) {
        produtosMock.forEach(p => {
            const d = document.createElement("div");
            d.className = "item";
            d.innerHTML = `<span>${p.nome} - R$ ${p.preco.toFixed(2)}</span> <button onclick="addCarrinho('${p.nome}', ${p.preco})">Adicionar</button>`;
            container.appendChild(d);
        });
    }
};
