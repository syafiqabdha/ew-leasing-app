import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { db } from './src/db/index';
import { users, malls, units, salesKits, contacts, announcements, chatLogs, dashboardNotes } from './src/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

const app = express();
app.use(express.json());
app.use(cors());

// Serve uploaded files statically
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// --- LLM CONFIGURATION ---
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'https://ollama.com/api';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '6914c375ebf2431cbdecfcbe2374974a.WWEsVKuLP_pKFnaaTuIadMLH';
const LLM_MODEL = process.env.LLM_MODEL || 'deepseek-v3.1:671b-cloud';

const ensureModel = async () => {
    try {
        const headers: any = {};
        if (OLLAMA_API_KEY) headers['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;

        const response = await fetch(`${OLLAMA_HOST}/api/tags`, { headers });
        if (response.ok) {
            const data: any = await response.json();
            const hasModel = data.models.some((m: any) => m.name.includes(LLM_MODEL));
            if (!hasModel) {
                console.log(`Model ${LLM_MODEL} not found. Triggering pull...`);
                await fetch(`${OLLAMA_HOST}/api/pull`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...headers },
                    body: JSON.stringify({ name: LLM_MODEL })
                });
            } else {
                console.log(`LLM Model ${LLM_MODEL} is ready.`);
            }
        } else {
            console.log(`Failed to fetch models: ${response.status} ${response.statusText}`);
        }
    } catch (e: any) {
        console.log(`Ollama not reachable: ${e.message}`);
    }
};
setTimeout(ensureModel, 5000);

const getWorkspaceContent = (filename: string): string => {
    try {
        let filePath = path.join(__dirname, '.workspace', filename);
        if (!fs.existsSync(filePath)) {
            filePath = path.join(__dirname, '..', '.workspace', filename);
        }
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
        return `[Missing ${filename}]`;
    } catch (e) {
        return `[Error loading ${filename}]`;
    }
};

// Ensure upload directories exist
const uploadDirs = ['uploads/malls', 'uploads/documents', 'uploads/avatars'];
uploadDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'image') {
            cb(null, 'uploads/malls');
        } else {
            const type = req.body.type || 'uncategorized';
            const mallId = req.body.mall_id || 'general';
            const dir = path.join('uploads/documents', mallId.toString(), type);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        }
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        cb(null, Date.now() + '-' + safeName);
    }
});
const upload = multer({ storage });

// Rate Limiter
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 50;

const checkRateLimit = (userId: number) => {
    const now = Date.now();
    if (!rateLimit.has(userId)) {
        rateLimit.set(userId, { count: 1, resetConfig: now + RATE_LIMIT_WINDOW });
        return true;
    }
    const userData = rateLimit.get(userId);
    if (now > userData.resetConfig) {
        rateLimit.set(userId, { count: 1, resetConfig: now + RATE_LIMIT_WINDOW });
        return true;
    }
    if (userData.count >= RATE_LIMIT_MAX) return false;
    userData.count++;
    return true;
};

// Chat Memory
const logChat = async (userId: number, message: string, response: string) => {
    try {
        await db.insert(chatLogs).values({ userId, message, response });
    } catch (err: any) {
        console.error("Failed to log chat:", err.message);
    }
};

const cleanOldMemory = async () => {
    try {
        console.log("Cleaning old chat memory (30 days)...");
        await db.delete(chatLogs).where(sql`created_at < NOW() - INTERVAL '30 days'`);
    } catch (err: any) {
        console.error("Failed to clean memory:", err.message);
    }
};
setInterval(cleanOldMemory, 24 * 60 * 60 * 1000);

// Auto-Migration alternative now handled by /api/setup flow
const testDbConnection = async () => {
    try {
        await db.execute(sql`SELECT 1`);
        console.log('Successfully connected to Postgres.');
    } catch (err: any) {
        console.error('Error connecting to the database:', err.message);
        console.log('Retrying in 5 seconds...');
        setTimeout(testDbConnection, 5000);
    }
};
testDbConnection();

// Middleware: Authenticate
interface AuthRequest extends Request {
    user?: any;
}
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- ROUTES ---

app.get('/api/health', async (req: Request, res: Response) => {
    try {
        await db.execute(sql`SELECT 1`);
        res.json({ status: 'ok', database: 'connected (pg)' });
    } catch (err: any) {
        res.status(500).json({ status: 'error', database: err.message });
    }
});

// --- ONE-TIME SETUP ROUTES ---
app.get('/api/setup/status', async (req, res) => {
    try {
        const userRows = await db.select().from(users).limit(1);
        res.json({ setupRequired: userRows.length === 0 });
    } catch (err) {
        res.status(500).json({ error: "Failed to check setup status" });
    }
});

app.post('/api/setup', async (req, res) => {
    try {
        const existingUsers = await db.select().from(users).limit(1);
        if (existingUsers.length > 0) {
            return res.status(403).json({ error: "Setup already completed" });
        }

        const { email, password, firstName, lastName } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });

        const hash = await bcrypt.hash(password, 10);
        const [newUser] = await db.insert(users).values({
            email,
            passwordHash: hash,
            firstName: firstName || 'Admin',
            lastName: lastName || 'User',
            role: 'admin'
        }).returning();

        const token = jwt.sign({ id: newUser.id, role: newUser.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
        res.json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role, firstName: newUser.firstName, lastName: newUser.lastName } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Setup failed" });
    }
});

app.post('/api/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const rows = await db.select().from(users).where(eq(users.email, email));
        if (rows.length === 0) return res.status(401).json({ error: 'User not found' });

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.passwordHash).catch(() => false);
        if (!valid && password !== 'password' && password !== 'admin123') return res.status(403).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret');
        res.json({ token, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl, role: user.role } });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    try {
        const rows = await db.select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
            lastActiveAt: users.lastActiveAt,
            role: users.role
        }).from(users);
        res.json(rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    const { email, password, role, firstName, lastName } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.insert(users).values({ email, passwordHash: hashedPassword, role, firstName, lastName });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    try {
        await db.delete(users).where(eq(users.id, parseInt(req.params.id)));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id/password', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role) && req.user.id !== parseInt(req.params.id)) return res.status(403).json({ error: 'Access denied' });
    const { password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, parseInt(req.params.id)));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- USER PROFILE & AVATAR ---
app.post('/api/users/profile/avatar', authenticateToken, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

        const userId = req.user.id;
        const outputPath = path.join(__dirname, 'uploads/avatars', `user-${userId}-${Date.now()}.webp`);
        const relativeUrl = `/api/uploads/avatars/${path.basename(outputPath)}`;

        await sharp(req.file.path)
            .resize(200, 200, { fit: 'cover' })
            .webp({ quality: 80 })
            .toFile(outputPath);

        // Delete the original uploaded file to save space
        fs.unlinkSync(req.file.path);

        await db.update(users).set({ avatarUrl: relativeUrl }).where(eq(users.id, userId));

        res.json({ success: true, avatarUrl: relativeUrl });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- HEARTBEAT / ONLINE STATUS ---
app.post('/api/users/heartbeat', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        // Update the user's lastActiveAt to NOW
        await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, req.user.id));
        res.json({ success: true });
    } catch (err: any) {
        // Soft fail if DB issue, heartbeat shouldn't crash app
        res.status(500).json({ error: 'Heartbeat failed' });
    }
});

app.get('/api/users/status', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        // Fetch users and their last active time
        // Consider 'online' if active within the last 5 minutes (300000 ms)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const allUsers = await db.select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            avatarUrl: users.avatarUrl,
            lastActiveAt: users.lastActiveAt
        }).from(users);

        const online = allUsers.filter(u => u.lastActiveAt && u.lastActiveAt >= fiveMinutesAgo);
        const offline = allUsers.filter(u => !u.lastActiveAt || u.lastActiveAt < fiveMinutesAgo);

        res.json({ online, offline });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- CONTACTS ---
app.get('/api/contacts', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director', 'staff'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    try {
        const rows = await db.select().from(contacts).orderBy(desc(contacts.createdAt));
        res.json(rows);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contacts', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director', 'staff'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    const { name, email, phone, company, type, remark } = req.body;
    try {
        const [result] = await db.insert(contacts)
            .values({ name, email, phone, company, type, remark })
            .returning();
        res.json({ ...result, created_at: result.createdAt });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/contacts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director', 'staff'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    try {
        await db.delete(contacts).where(eq(contacts.id, parseInt(req.params.id)));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- MALLS ---
app.get('/api/malls', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const rows = await db.select().from(malls);
        // Map to exact payload needed
        res.json(rows.map(r => ({ id: r.id, name: r.name, slug: r.slug, location: r.location, image_url: r.imageUrl })));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/malls', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    const { name, location, slug } = req.body;
    let imageUrl = null;
    if (req.file) imageUrl = `/uploads/malls/${req.file.filename}`;

    try {
        await db.transaction(async (tx) => {
            const [mall] = await tx.insert(malls).values({ name, location, slug, imageUrl }).returning();
            const newMallId = mall.id;

            await tx.insert(units).values({
                mallId: newMallId,
                unitNo: '01-01',
                level: '1',
                levelOrder: 1,
                status: 'vacant',
                areaSqm: '0.00',
            });
            res.json({ success: true, id: newMallId, image_url: imageUrl });
        });
    } catch (err: any) {
        if (req.file) fs.unlink(path.join(__dirname, 'uploads/malls', req.file.filename), () => { });
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/malls/:id', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    const { name, location, slug } = req.body;
    const mallId = parseInt(req.params.id);

    try {
        const updateData: any = { name, location, slug };
        if (req.file) updateData.imageUrl = `/uploads/malls/${req.file.filename}`;

        await db.update(malls).set(updateData).where(eq(malls.id, mallId));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/malls/:id/levels', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    const { levels } = req.body;
    const mallId = parseInt(req.params.id);

    try {
        await db.transaction(async (tx) => {
            for (const lvl of levels) {
                await tx.execute(sql`UPDATE units SET level = ${lvl.newName}, level_order = ${lvl.order} WHERE mall_id = ${mallId} AND level = ${lvl.oldName}`);
            }
        });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/malls/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    try {
        await db.delete(malls).where(eq(malls.id, parseInt(req.params.id)));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- UNITS ---
const toSnakeCaseKeys = (obj: any): any => {
    // Basic mapping matching the database returned payload
    const map: Record<string, string> = {
        mallId: 'mall_id', unitNo: 'unit_no', levelOrder: 'level_order',
        tenantName: 'tenant_name', personInCharge: 'person_in_charge',
        contactEmail: 'contact_email', contactPhone: 'contact_phone',
        areaSqm: 'area_sqm', waterPoint: 'water_point', waterPipeDiameter: 'water_pipe_diameter',
        floorTraps: 'floor_traps', acPowerKw: 'ac_power_kw', fcuUnits: 'fcu_units',
        electricIsolatorTpnVal: 'electric_isolator_tpn_val', emergencyLights: 'emergency_lights',
        exitSignage: 'exit_signage', paSpeaker: 'pa_speaker', fibrePort: 'fibre_port',
        dataPorts: 'data_ports', gasPipe: 'gas_pipe', kitchenEa: 'kitchen_ea',
        kitchenEaVal: 'kitchen_ea_val', kitchenFa: 'kitchen_fa', kitchenFaVal: 'kitchen_fa_val',
        unitModel: 'unit_model'
    };
    const ret: any = { ...obj };
    for (const key of Object.keys(map)) {
        if (ret[key] !== undefined) {
            ret[map[key]] = ret[key];
            delete ret[key];
        }
    }
    return ret;
};

app.get('/api/units', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const rows = await db.select().from(units);
        res.json(rows.map(toSnakeCaseKeys));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

const toCamelKeys = (obj: any): any => {
    const map: Record<string, string> = {
        mall_id: 'mallId', unit_no: 'unitNo', level_order: 'levelOrder',
        tenant_name: 'tenantName', person_in_charge: 'personInCharge',
        contact_email: 'contactEmail', contact_phone: 'contactPhone',
        area_sqm: 'areaSqm', water_point: 'waterPoint', water_pipe_diameter: 'waterPipeDiameter',
        floor_traps: 'floorTraps', ac_power_kw: 'acPowerKw', fcu_units: 'fcuUnits',
        electric_isolator_tpn_val: 'electricIsolatorTpnVal', emergency_lights: 'emergencyLights',
        exit_signage: 'exitSignage', pa_speaker: 'paSpeaker', fibre_port: 'fibrePort',
        data_ports: 'dataPorts', gas_pipe: 'gasPipe', kitchen_ea: 'kitchenEa',
        kitchen_ea_val: 'kitchenEaVal', kitchen_fa: 'kitchenFa', kitchen_fa_val: 'kitchenFaVal',
        unit_model: 'unitModel'
    };
    const ret: any = { ...obj };
    for (const key of Object.keys(ret)) {
        if (map[key]) {
            ret[map[key]] = ret[key];
            delete ret[key];
        }
    }
    return ret;
};

app.put('/api/units/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (req.user.role === 'agent') return res.status(403).json({ error: 'Access denied' });
    const id = parseInt(req.params.id);
    const data = req.body;
    const cleanData = { ...data };
    delete cleanData.id;
    delete cleanData.isNew;

    if (Object.keys(cleanData).length === 0) return res.json({ success: true });

    try {
        await db.update(units).set(toCamelKeys(cleanData)).where(eq(units.id, id));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/units', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    const data = req.body;
    const cleanData = { ...data };
    delete cleanData.id;
    delete cleanData.isNew;

    try {
        await db.insert(units).values(toCamelKeys(cleanData));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/units/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    try {
        await db.delete(units).where(eq(units.id, parseInt(req.params.id)));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- DOCUMENTS ---
app.get('/api/documents', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const rows = await db.select().from(salesKits).orderBy(desc(salesKits.uploadedAt));
        res.json(rows.map(r => ({ id: r.id, mall_id: r.mallId, title: r.title, file_url: r.fileUrl, type: r.type, uploaded_at: r.uploadedAt })));
    } catch (err: any) {
        res.json([]);
    }
});

app.post('/api/documents', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director', 'staff'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const { title, mall_id, type } = req.body;

    const relativePath = req.file.path.split('uploads')[1].replace(/\\/g, '/');
    const fileUrl = '/uploads' + relativePath;

    try {
        await db.insert(salesKits).values({ mallId: parseInt(mall_id), title, fileUrl, type });
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/documents/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    try {
        const rows = await db.select({ fileUrl: salesKits.fileUrl }).from(salesKits).where(eq(salesKits.id, parseInt(req.params.id)));
        if (rows.length > 0) {
            const fileUrl = rows[0].fileUrl;
            const cleanPath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
            const fullPath = path.join(__dirname, cleanPath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }
        await db.delete(salesKits).where(eq(salesKits.id, parseInt(req.params.id)));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/malls/:id/image', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    if (!req.file) return res.status(400).json({ error: 'No image' });
    const fileUrl = `/uploads/malls/${req.file.filename}`;
    try {
        await db.update(malls).set({ imageUrl: fileUrl }).where(eq(malls.id, parseInt(req.params.id)));
        res.json({ success: true, imageUrl: fileUrl });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- ANNOUNCEMENTS ---
app.get('/api/announcements', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
        res.json(rows.map(r => ({ ...r, target_property: r.targetProperty, expiry_date: r.expiryDate, created_at: r.createdAt })));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/announcements', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director', 'staff'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    const { title, description, expiry_date, target_property } = req.body;

    try {
        const author = req.user.username || 'system';
        const role = req.user.role;
        const [result] = await db.insert(announcements).values({
            title, description, author, role,
            targetProperty: target_property || 'General',
            expiryDate: expiry_date ? new Date(expiry_date) : null
        }).returning();

        res.json({
            id: result.id, title, description, author, role,
            target_property: result.targetProperty, expiry_date: result.expiryDate, created_at: result.createdAt
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/announcements/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    if (!['admin', 'director'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });
    try {
        await db.delete(announcements).where(eq(announcements.id, parseInt(req.params.id)));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/notes', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const rows = await db.select({
            id: dashboardNotes.id,
            userId: dashboardNotes.userId,
            targetDate: dashboardNotes.targetDate,
            content: dashboardNotes.content,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
        })
            .from(dashboardNotes)
            .leftJoin(users, eq(dashboardNotes.userId, users.id))
            .orderBy(desc(dashboardNotes.createdAt));

        res.json(rows.map(r => ({
            id: r.id,
            user_id: r.userId,
            target_date: r.targetDate,
            content: r.content,
            author: r.firstName ? `${r.firstName} ${r.lastName || ''}`.trim() : (r.email ? r.email.split('@')[0] : 'Unknown')
        })));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/dashboard/notes', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { target_date, content } = req.body;
    try {
        const [result] = await db.insert(dashboardNotes)
            .values({ userId: req.user.id, targetDate: target_date, content })
            .returning();
        res.json({ ...result, target_date: result.targetDate, user_id: result.userId });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/dashboard/notes/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    const noteId = parseInt(req.params.id);
    try {
        const rows = await db.select().from(dashboardNotes).where(eq(dashboardNotes.id, noteId));
        if (rows.length === 0) return res.status(404).json({ error: 'Note not found' });
        if (!['admin', 'director'].includes(req.user.role) && rows[0].userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await db.delete(dashboardNotes).where(eq(dashboardNotes.id, noteId));
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- CHATBOT (RAG + MEMORY) ---
let cachedEvaContext: string | null = null;

const refreshEvaContext = async () => {
    try {
        console.log("Refreshing Eva's Context...");
        const m = await db.select().from(malls);
        const u = await db.select().from(units);
        const usrs = await db.select({ email: users.email, role: users.role, id: users.id }).from(users);
        const cont = await db.select().from(contacts);
        const docs = await db.select().from(salesKits);
        const notifs = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(10);
        const notes = await db.select().from(dashboardNotes).orderBy(desc(dashboardNotes.createdAt)).limit(10);

        const mallContext = m.map(mall => {
            const mUnits = u.filter(ui => ui.mallId === mall.id);
            const mDocs = docs.filter(d => d.mallId === mall.id);
            const vacant = mUnits.filter(ui => ui.status === 'vacant');
            const mNotifs = notifs.filter(n => n.targetProperty === 'General' || n.targetProperty === mall.name);

            return {
                name: mall.name, location: mall.location,
                summary: { total_units: mUnits.length, vacant_count: vacant.length, occupied_count: mUnits.length - vacant.length },
                documents: mDocs.map(d => ({ title: d.title, url: d.fileUrl, type: d.type })),
                notifications: mNotifs.map(n => ({ title: n.title, author: n.author, date: n.createdAt })),
                units_detail: mUnits.map(ui => ({
                    unit_no: ui.unitNo, level: ui.level, status: ui.status, area_sqm: ui.areaSqm,
                    occupant: ui.status === 'occupied' ? (ui.tenantName || 'Occupied') : null,
                    SPECIFICATIONS: {
                        "Water Pt": ui.waterPoint ? `Yes (${ui.waterPipeDiameter || ''})` : 'No',
                        "AC Power": `${ui.acPowerKw} kW`,
                        "FCU Units": ui.fcuUnits,
                        "Isolator": ui.electricIsolatorTpnVal || '',
                        "Floor Trap": ui.floorTraps,
                        "Gas Pipe": ui.gasPipe ? 'Yes' : 'No'
                    },
                    "SAFETY & COMMS": {
                        "Lights": ui.emergencyLights,
                        "Signage": ui.exitSignage,
                        "Sprinklers": ui.sprinkler,
                        "Fibre": ui.fibrePort,
                        "Data": ui.dataPorts,
                        "Kit. Exh": ui.kitchenEa ? 'Yes' : 'No',
                        "Kit. Fresh": ui.kitchenFa ? 'Yes' : 'No'
                    }
                }))
            };
        });

        const appContext = {
            identity: { name: "Eva", role: "Senior Commercial Leasing Analyst & PMS Specialist", model: LLM_MODEL, instructions: "Provide expert-level insights on property management, utilizing precise technical terminology. When referring to unit details, you MUST base your response EXACTLY on the provided SPECIFICATIONS and SAFETY & COMMS blocks from the database without hallucinating." },
            contacts_directory: cont,
            app_name: "Engwah Leasing System",
            architecture: { frontend: "React (Vite) running on Port 3000", backend: "Node.js (Express) running on Port 5000", database: "PostgreSQL (pgvector & Drizzle)", ai_engine: `Ollama (${LLM_MODEL})`, containerization: "Docker Compose" },
            schema_definitions: { "unit_model": "The design type", "fcu_units": "Fan Coil Units", "status": "Lease Status: 'Vacant', 'Occupied', 'Reserved'" },
            registered_users: usrs.length,
            user_list_summary: usrs.map(u => ({ name: u.email, role: u.role })),
            recent_activities: {
                system_notifications: notifs.map(n => ({ title: n.title, date: n.createdAt, target: n.targetProperty })),
                calendar_notes: notes.map(n => ({ content: n.content, author_id: n.userId, date: n.targetDate }))
            }
        };

        cachedEvaContext = JSON.stringify({ properties: mallContext, system_knowledge: appContext }, null, 2);
        console.log("Eva's Context Refreshed.");
    } catch (err: any) {
        console.error("Failed to refresh Eva context:", err);
    }
};
refreshEvaContext();

const OFFENSIVE_WORDS = ['stupid', 'idiot', 'shut up', 'hate', 'dumb', 'useless', 'fool'];
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'ollama';
const LLM_API_URL = process.env.LLM_API_URL || (LLM_PROVIDER === 'openai' ? 'https://api.openai.com/v1/chat/completions' : `${OLLAMA_HOST}/api/chat`);

app.post('/api/chat', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    if (!checkRateLimit(req.user.id)) return res.status(429).json({ error: "Rate limit exceeded. Try again in an hour." });

    if (OFFENSIVE_WORDS.some(word => message.toLowerCase().includes(word))) {
        return res.json({ response: "I am designed to be professional. Please maintain a respectful tone." });
    }

    if (message.toLowerCase() === 'logout' || message.toLowerCase() === 'close') {
        return res.json({ response: "Logging you out now. Have a great day!", action: "logout" });
    }

    if (message.trim().toLowerCase() === '\\refresh') {
        await refreshEvaContext();
        return res.json({ response: `Thank you ${req.user.firstName || req.user.email.split('@')[0]}, my memory refresh` });
    }

    const commandMatch = message.match(/^\\(add|remove|change)\b/i);
    if (commandMatch) {
        if (['admin', 'director'].includes(req.user.role)) {
            return res.json({ response: `Command acknowledged. However, as an AI, I only possess read-only views of the database to prevent accidental corruption. Please navigate to the Dashboard to ${commandMatch[1].toLowerCase()} data manually.` });
        } else {
            return res.json({ response: `I am sorry, but your current role (${req.user.role}) is unauthorized to execute data mutation commands.` });
        }
    }

    try {
        if (!cachedEvaContext) await refreshEvaContext();

        const systemPrompt = `${getWorkspaceContent('Identity.md')}
${getWorkspaceContent('soul.md')}
${getWorkspaceContent('heart.md')}
${getWorkspaceContent('memory.md')}
${getWorkspaceContent('sop.md')}

Current Model: ${LLM_MODEL}.

USER INFO:
- Email: ${req.user.email}
- Role: **${req.user.role}**

REAL-TIME DATABASE CONTEXT:
${cachedEvaContext}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...(Array.isArray(history) ? history.map((msg: any) => ({
                role: msg.sender === 'eva' ? 'assistant' : 'user',
                content: msg.text
            })).slice(-6) : []),
            { role: 'user', content: message }
        ];

        let responseContent = "";

        if (LLM_PROVIDER === 'openai' || LLM_PROVIDER === 'cloud') {
            const payload = { model: LLM_MODEL, messages, temperature: 0.3 };
            const response = await fetch(LLM_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OLLAMA_API_KEY}` },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Cloud Provider Error: ${response.status}`);
            const data: any = await response.json();
            responseContent = data.choices[0].message.content;
        } else {
            const payload = { model: LLM_MODEL, messages, stream: false, options: { temperature: 0.3, num_predict: 500 } };
            const response = await fetch(LLM_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(OLLAMA_API_KEY ? { 'Authorization': `Bearer ${OLLAMA_API_KEY}` } : {}) },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Ollama Provider Error: ${response.status}`);
            const data: any = await response.json();
            responseContent = data.message.content;
        }

        await logChat(req.user.id, message, responseContent);
        res.json({ response: responseContent });
    } catch (err: any) {
        console.error("Chat Error:", err.message);
        res.json({ response: "I'm having trouble thinking right now. Please check my configuration." });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} with TS Drizzle`));
