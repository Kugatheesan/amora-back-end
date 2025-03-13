import{ pool }from "../database"

export const userNameExists = async (username: string) => {
    const { rows } = await pool.query ("SELECT email FROM public.users u where u.username = $1", [username]);
    return rows.length >0;
}

export const userEmailExists = async (email:string) => {
    const { rows } = await pool.query ("SELECT email From public.users u where u.email = $1", [email])
   return rows.length >0
}

export const saveUser = async (username: string, email: string, password: string,role:string) => {
    const { rows } = await pool.query ("INSERT INTO public.users (username, email, password,role) VALUES ($1, $2, $3,$4) RETURNING user, username, email,role", [username, email, password,role]);
    return rows[0];
}

export const getUser =  async (username:string) => {
    const { rows } = await pool.query("SELECT * FROM public.users u where u.username = $1",[username]);
    return rows[0];
}

export const getUsersInfo = async () => {
    const users = await pool.query ("SELECT * FROM public.users");
    return users;
};

export const getUserProfile = async (username: string) => {
    const { rows } = await pool.query(`SELECT username FROM public.users u where u.username = $1`, [username])
    return rows[0];
}

export async function getUserByEmail(email: string) {
    return pool.query("SELECT * FROM users WHERE email = $1", [email]).then(res => res.rows[0]);
}

export async function updateOTP(userId: number, token: string, expiry: Date) {
    return pool.query("UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3", [token, expiry, userId]);
}

export async function getUserByOTP(token: string) {
    const { rows } = await pool.query(
        `SELECT * FROM public.users u WHERE u.reset_token = $1`, 
        [token]
    );

    return rows.length > 0 ? rows[0] : null; // Ensure a valid return
}

export async function updatePassword(userId: number, newPassword: string) {
    return pool.query("UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2", [newPassword, userId]);
}