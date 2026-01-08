

export default ()=>({
    app:{
        node_env:process.env.NODE_ENV,
        name:process.env.APP_NAME,
        description:process.env.APP_DESCRIPTION,
        port:process.env.PORT,
        swagger_base_url:process.env.SWAGGER_BASE_URL
    },
    redis:{
        host:process.env.REDIS_HOST || 'localhost',
        port:process.env.REDIS_PORT || 6379,
        password:process.env.REDIS_PASSWORD || 'root',
    },
    mail:{
        host:process.env.MAIL_HOST || 'smtp.gmail.com',
        port:process.env.MAIL_PORT || 587,
        mail_from:process.env.MAIL_FROM || '',
        mail_app_password:process.env.MAIL_APP_PASSWORD || '',
    },
})