

export default ()=>({
    app:{
        node_env:process.env.NODE_ENV,
        name:process.env.APP_NAME,
        description:process.env.APP_DESCRIPTION,
        port:Number(process.env.PORT),
        swagger_base_url:process.env.SWAGGER_BASE_URL
    },
    redis:{
        host:process.env.REDIS_HOST || 'localhost',
        port:Number(process.env.REDIS_PORT) || 6379,
        password:process.env.REDIS_PASSWORD,
    },
    mail:{
        host:process.env.MAIL_HOST || 'smtp.gmail.com',
        port:Number(process.env.MAIL_PORT) || 587,
        mail_from:process.env.MAIL_FROM || '',
        mail_app_password:process.env.MAIL_APP_PASSWORD || '',
        otp_validity_time: Number(process.env.OTP_VALIDITY_TIME),
        attempt_limit_window_time: Number(process.env.ATTEMPT_LIMIT_WINDOW_TIME),
        max_req_otp_attempt: Number(process.env.MAX_REQ_OTP_ATTEMPTS)
    },
    jwt:{
        secret:process.env.JWT_SECRET,
        expiresIn:Number(process.env.JWT_EXPIRES_IN),
        refresh_token_ttl:Number(process.env.REFRESH_TOKEN_TTL) * 24 * 60 * 60
    }
})