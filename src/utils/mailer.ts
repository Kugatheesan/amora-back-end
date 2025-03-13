import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, text: string) {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "vkugatheesan@gmail.com",
            pass: "arbx oqat zyua qjnu",
        },
    });

    await transporter.sendMail({
        from: '"Your App" <vkugatheesan@gmail.com>',
        to,
        subject,
        text,
    });
}
