const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({
    explicitArray: false,
    ignoreAttrs: true
});

function normalize(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

/**
 * 🔍 Extrai natOp de um XML
 */
async function getNatOpFromXml(filePath) {
    const xml = fs.readFileSync(filePath, 'utf8');
    const json = await parser.parseStringPromise(xml);

    try {
        return (
            json?.NFe?.infNFe?.ide?.natOp ||
            json?.nfeProc?.NFe?.infNFe?.ide?.natOp ||
            null
        );
    } catch {
        return null;
    }
}

/**
 * 🧾 Filtra XMLs por natOp permitida
 */
async function filterXmlsByNatOp(directory, allowedNatOps = []) {
    const files = fs.readdirSync(directory).filter(f => f.endsWith('.xml'));

    const accepted = [];
    const rejected = [];

    for (const file of files) {
        const fullPath = path.join(directory, file);

        try {
            const natOp = await getNatOpFromXml(fullPath);

            if (!natOp) {
                rejected.push({ file, reason: 'natOp não encontrada' });
                continue;
            }

            const normalizedNatOp = normalize(natOp);

            const allowed = allowedNatOps
                .map(normalize)
                .includes(normalizedNatOp);

            if (allowed) {
                accepted.push(file);
            } else {
                rejected.push({ file, natOp: normalizedNatOp });
            }
        } catch (err) {
            rejected.push({ file, error: err.message });
        }
    }

    return {
        accepted,
        rejected
    };
}

module.exports = {
    filterXmlsByNatOp
};
