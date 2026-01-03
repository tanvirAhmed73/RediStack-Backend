

export default ()=>({
    app:{
        node_env:process.env.NODE_ENV,
        name:process.env.APP_NAME,
        description:process.env.APP_DESCRIPTION,
        port:process.env.PORT,
        swagger_base_url:process.env.SWAGGER_BASE_URL
    },

})