package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 로컬 경로의 파일들을 '/fashion_images/**' 경로로 접근 가능하게 설정
        registry.addResourceHandler("/fashion_images/**")
                .addResourceLocations("file:///C:/Users/user1/Desktop/warelendstest/Ai/Clip/fashion_dataset/");
    }
}