package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
public class RecommendationController {

    private final RecommendationService recommendationService;
    public RecommendationController(RecommendationService recommendationService) { this.recommendationService = recommendationService; }

    @PostMapping("/upload")
    public Map<String, Object> uploadFile(@ModelAttribute UploadRequestDto requestDto) {
        try { return recommendationService.processRecommendation(requestDto); }
        catch (Exception e) { return Map.of("status", "ERROR", "message", e.getMessage()); }
    }

    // 쿼리 파라미터 (?taskId=...) 방식 대응
    @GetMapping("")
    public Map<String, Object> getRecommendationsByQuery(@RequestParam("taskId") String taskId) {
        return recommendationService.getAnalysisResult(taskId);
    }

    // 경로 변수 방식 대응
    @GetMapping("/analysis/{taskId}")
    public Map<String, Object> getAnalysisResult(@PathVariable("taskId") String taskId) {
        return recommendationService.getAnalysisResult(taskId);
    }

    @PostMapping("/validate/body")
    public Map<String, Object> validateBody(@RequestParam("file") MultipartFile file) { return recommendationService.validateBody(file); }
}